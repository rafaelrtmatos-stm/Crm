// Confirmação automática de PIX recebido no Nubank, lendo o e-mail "Você recebeu uma transferência
// pelo Pix" na caixa do Gmail (o Nubank não tem API nem webhook de Pix).
//
// Rota: POST /api/pix-email-check  { id: <id da linha em pix_pendentes> }  ->  { pago: true | false }
// (hospedada em api/ai.js via ?rota=pix-email-check, só pra respeitar o limite de 12 Serverless
// Functions do plano Hobby — ver vercel.json). NUNCA devolve conteúdo do e-mail: só { pago }.
//
// Regra de casamento (conservadora — na dúvida, NÃO dá baixa e o botão manual continua):
//  - só casa se existir EXATAMENTE UMA pendência em aberto (status 'pendente', não expirada) com
//    aquele valor; zero ou mais de uma -> pago:false;
//  - o e-mail precisa ser do remetente do Nubank, autêntico (DKIM/DMARC do Gmail), chegar depois
//    de criado_em da pendência (e antes de expira_em) e ainda não ter sido usado;
//  - se houver mais de um e-mail elegível com esse valor, também não casa (ambíguo);
//  - gravar email_message_id (índice único) impede reutilizar o mesmo e-mail.
//
// Variáveis de ambiente (nenhum valor no código):
//   GMAIL_IMAP_USER          e-mail do Gmail que recebe as notificações do Nubank
//   GMAIL_IMAP_APP_PASSWORD  senha de app do Google (conta com verificação em 2 etapas)
//   GMAIL_IMAP_HOST          opcional, padrão imap.gmail.com
//   GMAIL_IMAP_MAILBOX       opcional, padrão INBOX
//   PIX_EMAIL_FROM           opcional, padrão todomundo@nubank.com.br
//   PIX_EMAIL_SKIP_AUTH_CHECK=1  opcional, só pra depuração (desliga a checagem DKIM/DMARC)

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { SUPABASE_URL, supabaseHeaders } from './whatsapp-config.js';
import { exigirUsuarioAutorizado } from './auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_IMAP_MS = 7500; // a função da Vercel Hobby tem 10 s no total
const MAX_EMAILS_LIDOS = 15;

// ---------- Parser do e-mail ----------

/** "R$ 1.234,56" -> 123456 (centavos). Devolve null se não achar o valor. */
export function extrairValorCentavos(texto) {
  const t = String(texto || '').replace(/[\u00a0\u200b-\u200f]/g, ' ');
  // No e-mail do Nubank: "Valor recebido" numa linha e "R$ 0,02" na seguinte.
  const m = t.match(/Valor\s+recebido\s*:?\s*R\$\s*((?:\d{1,3}(?:\.\d{3})+|\d+)),(\d{2})(?!\d)/i);
  if (!m) return null;
  const reais = parseInt(m[1].replace(/\./g, ''), 10);
  const centavos = parseInt(m[2], 10);
  if (!Number.isFinite(reais) || !Number.isFinite(centavos)) return null;
  return reais * 100 + centavos;
}

/** Confere que é mesmo o aviso de Pix RECEBIDO (e não Pix enviado, promoção, e-mail encaminhado...). */
export function ehAvisoPixRecebido({ assunto, texto }) {
  return /pix/i.test(String(assunto || ''))
    && /voc[eê]\s+recebeu\s+uma\s+transfer[eê]ncia\s+pelo\s+pix/i.test(`${assunto || ''}\n${texto || ''}`);
}

/**
 * O Gmail grava em Authentication-Results se o remetente passou em DKIM/DMARC. Sem essa checagem,
 * qualquer pessoa conseguiria mandar um e-mail falso "Pix recebido" pra caixa e liberar a venda.
 */
export function remetenteAutenticado(authResults, dominio = 'nubank.com.br') {
  if (process.env.PIX_EMAIL_SKIP_AUTH_CHECK === '1') return true;
  const h = String(authResults || '').toLowerCase();
  if (!h.includes(dominio)) return false;
  return /dmarc=pass/.test(h) || /dkim=pass/.test(h);
}

// ---------- Supabase (REST, mesmo padrão de api/whatsapp-webhook.js) ----------

async function rest(path, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: supabaseHeaders(init.headers || {}),
  });
  const texto = await r.text();
  let corpo = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
  return { ok: r.ok, status: r.status, corpo };
}

const iso = (d) => encodeURIComponent(new Date(d).toISOString());

async function expirarVencidas(agora) {
  await rest(`pix_pendentes?status=eq.pendente&expira_em=lt.${iso(agora)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'expirado' }),
  });
}

async function lerPendencia(id) {
  const r = await rest(`pix_pendentes?id=eq.${id}&select=*`);
  if (!r.ok || !Array.isArray(r.corpo)) throw new Error(`falha ao ler pendência (${r.status})`);
  return r.corpo[0] || null;
}

/** Existe exatamente uma pendência em aberto com esse valor, e é a própria `p`? */
async function pendenciaUnicaAberta(p, agora) {
  const r = await rest(
    `pix_pendentes?status=eq.pendente&valor_centavos=eq.${p.valor_centavos}&expira_em=gt.${iso(agora)}&select=id`
  );
  if (!r.ok || !Array.isArray(r.corpo)) throw new Error(`falha ao contar pendências (${r.status})`);
  return r.corpo.length === 1 && r.corpo[0].id === p.id;
}

async function emailsJaUsados(messageIds) {
  if (messageIds.length === 0) return new Set();
  const lista = messageIds.map((m) => `"${String(m).replace(/"/g, '')}"`).join(',');
  const r = await rest(`pix_pendentes?email_message_id=in.(${encodeURIComponent(lista)})&select=email_message_id`);
  if (!r.ok || !Array.isArray(r.corpo)) throw new Error(`falha ao checar e-mails usados (${r.status})`);
  return new Set(r.corpo.map((x) => x.email_message_id));
}

/** Marca como paga de forma atômica. true só se ESTA chamada (ou uma anterior igual) deu a baixa. */
async function reivindicar(p, messageId, agora) {
  const r = await rest(
    `pix_pendentes?id=eq.${p.id}&status=eq.pendente&expira_em=gt.${iso(agora)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'pago', pago_em: new Date(agora).toISOString(), email_message_id: messageId }),
    }
  );
  if (r.status === 409) return false; // índice único: esse e-mail já confirmou outra pendência
  if (!r.ok) throw new Error(`falha ao marcar pago (${r.status})`);
  if (Array.isArray(r.corpo) && r.corpo.length === 1) return true;
  // Nenhuma linha atualizada: outra chamada pode ter acabado de pagar a mesma pendência.
  const atual = await lerPendencia(p.id);
  return !!atual && atual.status === 'pago' && atual.email_message_id === messageId;
}

// ---------- Gmail (IMAP) ----------

async function buscarEmailsElegiveis(p) {
  const user = process.env.GMAIL_IMAP_USER;
  const pass = process.env.GMAIL_IMAP_APP_PASSWORD;
  if (!user || !pass) throw new Error('GMAIL_IMAP_USER / GMAIL_IMAP_APP_PASSWORD não configuradas');
  const remetente = (process.env.PIX_EMAIL_FROM || 'todomundo@nubank.com.br').toLowerCase();

  const inicio = new Date(p.criado_em).getTime();
  const fim = new Date(p.expira_em).getTime();
  const desdeDia = new Date(inicio - 24 * 3600 * 1000); // SINCE do IMAP só olha o dia; o horário exato é filtrado abaixo

  const client = new ImapFlow({
    host: process.env.GMAIL_IMAP_HOST || 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: LIMITE_IMAP_MS,
    greetingTimeout: 4000,
  });

  const achados = [];
  const trabalho = (async () => {
    await client.connect();
    const lock = await client.getMailboxLock(process.env.GMAIL_IMAP_MAILBOX || 'INBOX');
    try {
      const uids = await client.search({ from: remetente, since: desdeDia }, { uid: true });
      if (!uids || uids.length === 0) return;
      const recentes = uids.slice(-MAX_EMAILS_LIDOS);
      for await (const msg of client.fetch(recentes, { uid: true, internalDate: true, source: true }, { uid: true })) {
        const recebidoEm = new Date(msg.internalDate).getTime();
        if (!(recebidoEm >= inicio && recebidoEm <= fim)) continue;
        const parsed = await simpleParser(msg.source);
        const de = (parsed.from?.value || []).map((v) => String(v.address || '').toLowerCase());
        if (!de.includes(remetente)) continue;
        if (!remetenteAutenticado(parsed.headers?.get('authentication-results'))) continue;
        const texto = parsed.text || '';
        if (!ehAvisoPixRecebido({ assunto: parsed.subject, texto })) continue;
        const valor = extrairValorCentavos(texto);
        const messageId = parsed.messageId;
        if (valor == null || !messageId) continue;
        achados.push({ messageId, valor, recebidoEm });
      }
    } finally {
      lock.release();
    }
  })();

  let timer;
  const limite = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('tempo esgotado lendo o Gmail')), LIMITE_IMAP_MS); });
  try {
    await Promise.race([trabalho, limite]);
  } finally {
    clearTimeout(timer);
    try { client.close(); } catch { /* conexão já caiu */ }
    trabalho.catch(() => {}); // evita "unhandled rejection" se o limite estourou antes
  }
  return achados.filter((e) => e.valor === p.valor_centavos);
}

// ---------- Fluxo principal ----------

async function verificarPendencia(id) {
  const agora = new Date();
  await expirarVencidas(agora);

  const p = await lerPendencia(id);
  if (!p) return false;
  if (p.status === 'pago') return !!p.email_message_id; // repetição de uma consulta cuja resposta se perdeu
  if (p.status !== 'pendente') return false;
  if (new Date(p.expira_em).getTime() <= agora.getTime()) return false;

  if (!(await pendenciaUnicaAberta(p, agora))) return false; // zero ou mais de uma -> fluxo manual

  const candidatos = await buscarEmailsElegiveis(p);
  if (candidatos.length === 0) return false;
  const usados = await emailsJaUsados(candidatos.map((c) => c.messageId));
  const livres = candidatos.filter((c) => !usados.has(c.messageId));
  if (livres.length !== 1) return false; // nenhum, ou ambíguo

  const depois = new Date();
  // Reconfere logo antes de gravar: outra pendência com o mesmo valor pode ter aberto durante a leitura do Gmail.
  if (!(await pendenciaUnicaAberta(p, depois))) return false;
  return reivindicar(p, livres[0].messageId, depois);
}

export async function handlePixEmailCheck(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const id = String(req.body?.id || '').trim();
  if (!UUID_RE.test(id)) {
    res.status(400).json({ pago: false });
    return;
  }
  try {
    const pago = await verificarPendencia(id);
    res.status(200).json({ pago });
  } catch (err) {
    // Detalhes só no log do servidor; o navegador recebe apenas { pago: false } e segue no fluxo manual.
    console.error('[pix-email-check]', err?.message || err);
    res.status(200).json({ pago: false });
  }
}
