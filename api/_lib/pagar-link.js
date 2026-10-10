// Link de pagamento PIX (página pública /pagar/:token) — lado do servidor.
//
// Rota: POST /api/ai?rota=pagar-link   (hospedada em api/ai.js só pra respeitar o limite de 12 Serverless
// Functions do plano Hobby da Vercel; a rota é PÚBLICA — o cliente não está logado)
//   { acao: "registrar", token, opcaoId }      -> { pendenteId, expiraEm }
//        cria a pendência em pix_pendentes (valor vem SEMPRE da opção salva no link, nunca do navegador)
//   { acao: "checar", token, pendenteId }      -> { pago: true | false }
//        confere a pendência (mesmo mecanismo do card de PIX: e-mail do Nubank) e, se pagou, dá a baixa
//        na nota UMA única vez e avisa o cliente por WhatsApp.
//
// Segurança: o token (32 hex aleatórios) é o segredo do link; só devolvemos { pago }. Nenhuma credencial
// no código (usa as mesmas variáveis de ambiente do restante do projeto).

import { waitUntil } from '@vercel/functions';
import { APP_BASE_URL, SUPABASE_URL, supabaseHeaders } from './whatsapp-config.js';
import { verificarPendencia } from './pix-email.js';

const TOKEN_RE = /^[0-9a-f]{32}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTERVALO_MINIMO_MS = 4000; // evita martelar o Gmail se alguém chamar a rota em loop
const ultimaChecagem = new Map();

async function rest(path, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: supabaseHeaders(init.headers || {}) });
  const corpo = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, corpo };
}

const fmtBRL = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const round2 = (n) => Math.round(n * 100) / 100;

async function carregarLink(token) {
  const r = await rest(`pagamento_links?token=eq.${token}&select=*&limit=1`);
  if (!r.ok || !Array.isArray(r.corpo)) throw new Error(`falha ao ler link (${r.status})`);
  return r.corpo[0] || null;
}

async function carregarPendencia(id) {
  const r = await rest(`pix_pendentes?id=eq.${id}&select=*&limit=1`);
  if (!r.ok || !Array.isArray(r.corpo)) throw new Error(`falha ao ler pendência (${r.status})`);
  return r.corpo[0] || null;
}

/** Soma o PIX recebido na nota (down_payment/received_value/payments/status), com trava otimista. */
async function aplicarBaixaNaNota(link, valor) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const g = await rest(`vendas?id=eq.${encodeURIComponent(link.sale_id)}&select=total,down_payment,payments,status&limit=1`);
    if (!g.ok || !Array.isArray(g.corpo) || !g.corpo[0]) throw new Error('nota não encontrada para a baixa');
    const venda = g.corpo[0];
    if (venda.status === 'canceled') return { restante: null };
    const pagoAntes = venda.down_payment == null ? null : Number(venda.down_payment) || 0;
    const novoPago = round2((pagoAntes || 0) + valor);
    const restante = Math.max(0, round2(Number(venda.total) - novoPago));
    const pagamentos = [...(Array.isArray(venda.payments) ? venda.payments : []), { method: 'pix', value: valor, date: new Date().toISOString() }];
    const filtroVersao = pagoAntes == null ? 'down_payment=is.null' : `down_payment=eq.${pagoAntes}`;
    const u = await rest(`vendas?id=eq.${encodeURIComponent(link.sale_id)}&${filtroVersao}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        down_payment: novoPago,
        received_value: novoPago,
        payments: pagamentos,
        status: restante <= 0.009 ? 'completed' : 'pending',
        updated_at: new Date().toISOString(),
      }),
    });
    if (u.ok && Array.isArray(u.corpo) && u.corpo.length > 0) return { restante };
    // Alguém alterou a nota entre a leitura e a gravação: relê e tenta de novo.
  }
  throw new Error('não foi possível atualizar a nota (conflito)');
}

async function avisarCliente(link, valor, restante) {
  try {
    if (!APP_BASE_URL || !link.cliente_phone || !link.criado_por) return;
    const linhas = [
      '✅ *Pagamento PIX confirmado*',
      `Cliente: ${link.cliente_nome || 'Cliente'}`,
      `Valor: ${fmtBRL(valor)}`,
      `Referente a: ${link.resumo || 'Pedido'}`,
      `Nota #${String(link.sale_id).slice(-6).toUpperCase()}`,
      restante != null && restante > 0.009 ? `Restante: ${fmtBRL(restante)}` : 'Nota quitada. Obrigado!',
    ];
    await fetch(`${APP_BASE_URL}/api/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': String(link.criado_por) },
      body: JSON.stringify({ phone: link.cliente_phone, text: linhas.join('\n'), senderName: 'Sistema' }),
    });
  } catch (err) {
    console.warn('[pagar-link] aviso por WhatsApp falhou:', err?.message || err);
  }
}

/** Dá a baixa uma única vez: o PATCH condicional em baixa_em IS NULL só vence para UMA chamada. */
async function darBaixa(link, pendencia) {
  const valor = round2(pendencia.valor_centavos / 100);
  const opcao = (Array.isArray(link.opcoes) ? link.opcoes : []).find((o) => o.valor_centavos === pendencia.valor_centavos);
  const agora = new Date().toISOString();
  const claim = await rest(`pagamento_links?id=eq.${link.id}&baixa_em=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'pago', pago_em: agora, valor_pago_centavos: pendencia.valor_centavos, opcao_escolhida: opcao?.id || null, baixa_em: agora }),
  });
  if (!claim.ok) throw new Error(`falha ao marcar link como pago (${claim.status})`);
  if (!Array.isArray(claim.corpo) || claim.corpo.length === 0) return; // outra chamada já deu a baixa
  const { restante } = await aplicarBaixaNaNota(link, valor);
  waitUntil(avisarCliente(link, valor, restante));
}

export async function handlePagarLink(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const acao = String(req.body?.acao || '');
  const token = String(req.body?.token || '').trim();
  if (!TOKEN_RE.test(token)) { res.status(400).json({ erro: 'Link inválido.' }); return; }

  try {
    const link = await carregarLink(token);
    if (!link) { res.status(404).json({ erro: 'Link não encontrado.' }); return; }

    if (acao === 'registrar') {
      if (link.status !== 'ativo') { res.status(409).json({ erro: 'Este link já foi pago ou cancelado.' }); return; }
      if (Date.now() >= new Date(link.expira_em).getTime()) { res.status(410).json({ erro: 'Este link expirou. Peça um novo.' }); return; }
      const opcao = (Array.isArray(link.opcoes) ? link.opcoes : []).find((o) => o.id === String(req.body?.opcaoId || ''));
      if (!opcao || !(opcao.valor_centavos > 0)) { res.status(400).json({ erro: 'Opção inválida.' }); return; }
      // Uma tentativa por vez: encerra pendências abertas anteriores deste mesmo link.
      await rest(`pix_pendentes?sale_id=eq.${encodeURIComponent(`link:${token}`)}&status=eq.pendente`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'expirado' }),
      });
      const ins = await rest('pix_pendentes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ company_id: link.company_id, sale_id: `link:${token}`, valor_centavos: opcao.valor_centavos }),
      });
      const nova = Array.isArray(ins.corpo) ? ins.corpo[0] : null;
      if (!ins.ok || !nova) { res.status(502).json({ erro: 'Não foi possível iniciar o pagamento agora.' }); return; }
      res.status(200).json({ pendenteId: nova.id, expiraEm: nova.expira_em });
      return;
    }

    if (acao === 'checar') {
      if (link.status === 'pago') { res.status(200).json({ pago: true }); return; }
      const pendenteId = String(req.body?.pendenteId || '').trim();
      if (!UUID_RE.test(pendenteId)) { res.status(400).json({ pago: false }); return; }
      const pend = await carregarPendencia(pendenteId);
      if (!pend || pend.sale_id !== `link:${token}`) { res.status(200).json({ pago: false }); return; }

      let pago = pend.status === 'pago';
      if (!pago) {
        if (pend.status !== 'pendente' || Date.now() >= new Date(pend.expira_em).getTime()) { res.status(200).json({ pago: false }); return; }
        const ultima = ultimaChecagem.get(pendenteId) || 0;
        if (Date.now() - ultima < INTERVALO_MINIMO_MS) { res.status(200).json({ pago: false }); return; }
        ultimaChecagem.set(pendenteId, Date.now());
        if (ultimaChecagem.size > 500) ultimaChecagem.clear();
        pago = await verificarPendencia(pendenteId);
      }
      if (pago) {
        const atual = await carregarPendencia(pendenteId);
        await darBaixa(link, atual || pend);
      }
      res.status(200).json({ pago });
      return;
    }

    res.status(400).json({ erro: 'Ação inválida.' });
  } catch (err) {
    // Detalhes só no log do servidor; o navegador recebe apenas { pago: false } e o cliente pode tentar de novo.
    console.error('[pagar-link]', err?.message || err);
    res.status(200).json({ pago: false });
  }
}
