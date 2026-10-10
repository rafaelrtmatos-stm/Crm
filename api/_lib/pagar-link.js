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
// Também hospeda (mesma Serverless Function, sempre via api/ai.js):
//   ?rota=pix-aviso       "campainha" do Google Apps Script quando chega e-mail novo do Nubank (header x-pix-secret,
//                         variável PIX_WEBHOOK_SECRET) -> confere os links com pendência aberta e dá a baixa
//   ?rota=verificar-notas CRM (x-user-id): confere os links ativos de uma nota ou de todas as notas abertas
// A pendência de cada escolha de valor vale até o vencimento do link (não mais 30 min).
//
// Segurança: o token (32 hex aleatórios) é o segredo do link; só devolvemos { pago }. Nenhuma credencial
// no código (usa as mesmas variáveis de ambiente do restante do projeto).

import { timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { APP_BASE_URL, SUPABASE_URL, supabaseHeaders } from './whatsapp-config.js';
import { verificarPendencia } from './pix-email.js';
import { exigirUsuarioAutorizado } from './auth.js';

const TOKEN_RE = /^[0-9a-f]{32}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTERVALO_MINIMO_MS = 4000; // evita martelar o Gmail se alguém chamar a rota em loop
const ultimaChecagem = new Map();
const PRAZO_CONFERENCIA_MS = 5500; // a função da Vercel Hobby tem 10 s; não inicia nova leitura do Gmail depois disso
const INTERVALO_MINIMO_CRM_MS = 10000; // conferência pedida pelo CRM: no máximo 1 a cada 10 s por nota
const ultimaConferenciaCrm = new Map();
let conferindoAgora = false;

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
    const g = await rest(`vendas?id=eq.${encodeURIComponent(link.sale_id)}&select=total,down_payment,payments,status,customer_name&limit=1`);
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
    if (u.ok && Array.isArray(u.corpo) && u.corpo.length > 0) return { restante, total: Number(venda.total), clienteNome: String(venda.customer_name || '').trim(), itens: Array.isArray(venda.items) ? venda.items : [], pagamentos };
    // Alguém alterou a nota entre a leitura e a gravação: relê e tenta de novo.
  }
  throw new Error('não foi possível atualizar a nota (conflito)');
}

const ROTULO_PAGAMENTO = {
  pix: 'PIX', dinheiro: 'Dinheiro', cartao_debito: 'Cartão de Débito', cartao_credito: 'Cartão de Crédito',
  transferencia: 'Transferência', boleto: 'Boleto', crediario: 'Crediário',
};

function montarMensagemPagamento({ nome, valor, resumo, itens, total, pagamentos }) {
  const lista = (Array.isArray(pagamentos) ? pagamentos : [])
    .filter((x) => Number(x?.value) > 0)
    .map((x) => ({ metodo: String(x.method || 'pix'), valor: Number(x.value) }));
  const totalPago = round2(lista.reduce((a, x) => a + x.valor, 0));
  const falta = Math.max(0, round2(Number(total) - totalPago));
  const linhas = [`Olá ${nome}!`, '', `Valor: ${fmtBRL(valor)}`, `Referente a: ${resumo || 'Pedido'}`];
  const its = (Array.isArray(itens) ? itens : []).filter((i) => i && i.name);
  if (its.length > 0) {
    linhas.push('');
    for (const i of its) {
      const qtd = Number(i.quantity) || 1;
      linhas.push(`* ${qtd}x ${i.name} (${fmtBRL((Number(i.price) || 0) * qtd)})`);
    }
  }
  linhas.push('', `💰 Total dos Itens: ${fmtBRL(Number(total))}`);
  for (const x of lista) linhas.push(`💵 ${ROTULO_PAGAMENTO[x.metodo] || x.metodo}: ${fmtBRL(x.valor)}`);
  linhas.push(`✅ Total Pago/Recebido: ${fmtBRL(totalPago)}`);
  linhas.push(falta > 0.009 ? `🔴 Valor que Falta Pagar: ${fmtBRL(falta)}` : '🟢 Nota quitada!');
  linhas.push('', 'Obrigado pela preferência!');
  return linhas.join('\n');
}

async function avisarCliente(link, valor, restante, resultado) {
  try {
    if (!APP_BASE_URL || !link.cliente_phone || !link.criado_por) return;
    // Nome completo: vem da própria nota (o link guarda só o nome abreviado, que é o que a página pública mostra).
    let nomeCompleto = resultado?.clienteNome || '';
    if (!nomeCompleto) {
      try {
        const n = await rest(`vendas?id=eq.${encodeURIComponent(link.sale_id)}&select=customer_name&limit=1`);
        if (n.ok && Array.isArray(n.corpo) && n.corpo[0]?.customer_name) nomeCompleto = String(n.corpo[0].customer_name).trim();
      } catch { /* usa o nome do link */ }
    }
    const texto = (resultado?.total > 0 && Array.isArray(resultado?.pagamentos))
      ? montarMensagemPagamento({ nome: nomeCompleto || link.cliente_nome || 'Cliente', valor, resumo: link.resumo, itens: resultado.itens, total: resultado.total, pagamentos: resultado.pagamentos })
      : [
        '✅ *Pagamento PIX confirmado*',
        `Cliente: ${nomeCompleto || link.cliente_nome || 'Cliente'}`,
        `Valor: ${fmtBRL(valor)}`,
        `Referente a: ${link.resumo || 'Pedido'}`,
        `Nota #${String(link.sale_id).slice(-6).toUpperCase()}`,
        restante != null && restante > 0.009 ? `Restante: ${fmtBRL(restante)}` : 'Nota quitada. Obrigado!',
      ].join('\n');
    await fetch(`${APP_BASE_URL}/api/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': String(link.criado_por) },
      body: JSON.stringify({ phone: link.cliente_phone, text: texto, senderName: 'Sistema' }),
    });
  } catch (err) {
    console.warn('[pagar-link] aviso por WhatsApp falhou:', err?.message || err);
  }
}

/**
 * Notificação interna "pagamento recebido" (tabela crm_payment_notifications): UMA por pagamento confirmado.
 * pendente_id é UNIQUE e o insert usa ignore-duplicates, então o mesmo evento repetido pelo provedor/e-mail não gera
 * segunda notificação; dois pagamentos diferentes (duas pendências) geram duas. Nunca lança: qualquer falha (inclusive a
 * tabela ainda não existir) só vai para o log e NÃO atrapalha a baixa nem o aviso ao cliente.
 */
async function registrarNotificacaoPagamento(link, pendencia, valor, resultado) {
  try {
    if (!pendencia?.id || !UUID_RE.test(String(pendencia.id))) return;
    const restante = Math.max(0, round2(Number(resultado.restante) || 0));
    const quitou = restante <= 0.009;
    const r = await rest('crm_payment_notifications?on_conflict=pendente_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        company_id: link.company_id,
        sale_id: String(link.sale_id),
        link_id: link.id,
        pendente_id: pendencia.id,
        cliente_nome: resultado.clienteNome || link.cliente_nome || null,
        valor_centavos: Math.round(valor * 100),
        total_centavos: Number.isFinite(resultado.total) ? Math.round(resultado.total * 100) : null,
        restante_centavos: Math.round(restante * 100),
        tipo: quitou ? 'pagamento' : 'entrada',
      }),
    });
    if (!r.ok) console.warn(`[pagar-link] notificação de pagamento não registrada (${r.status}):`, JSON.stringify(r.corpo)?.slice(0, 200));
  } catch (err) {
    console.warn('[pagar-link] notificação de pagamento falhou:', err?.message || err);
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
  if (!Array.isArray(claim.corpo) || claim.corpo.length === 0) return false; // outra chamada já deu a baixa
  let resultado;
  try {
    resultado = await aplicarBaixaNaNota(link, valor);
  } catch (err) {
    // A nota NÃO foi atualizada: devolve o link ao estado "ativo" para a próxima conferência tentar de novo
    // (sem isso o link ficaria marcado como pago e a nota pendente para sempre).
    await rest(`pagamento_links?id=eq.${link.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ativo', pago_em: null, valor_pago_centavos: null, opcao_escolhida: null, baixa_em: null }),
    }).catch(() => {});
    throw err;
  }
  if (resultado.restante == null) {
    // Nota cancelada: o PIX entrou, mas não há o que baixar. Fica no log para conferência manual; não avisa o cliente.
    console.warn(`[pagar-link] PIX de ${fmtBRL(valor)} recebido em nota cancelada (link ${link.id}); sem baixa nem aviso.`);
    return true;
  }
  // Aviso interno (som + notificação clicável no CRM). Await curto e sem lançar: não adia nem derruba o aviso ao cliente.
  await registrarNotificacaoPagamento(link, pendencia, valor, resultado);
  waitUntil(avisarCliente(link, valor, resultado.restante, resultado));
  return true;
}

/**
 * Confere os links ativos SEM depender da página do cliente aberta.
 *  - pendência já paga mas nota ainda sem baixa (falha anterior): só dá a baixa;
 *  - pendência em aberto: roda verificarPendencia (e-mail do Nubank, mesma regra de casamento exato de valor).
 * Faz poucas leituras: parte dos links ativos e só vai ao Gmail se houver pendência aberta.
 * `saleId` restringe a uma nota. Devolve { verificados, pagos, baixadas: [sale_id], completo }.
 */
async function conferirLinksAbertos({ saleId = null, prazoMs = PRAZO_CONFERENCIA_MS } = {}) {
  const inicio = Date.now();
  const vazio = { verificados: 0, pagos: 0, baixadas: [], completo: true };
  if (conferindoAgora) return { ...vazio, completo: false }; // já há uma conferência nesta instância
  conferindoAgora = true;
  try {
    const agoraIso = encodeURIComponent(new Date().toISOString());
    const filtroNota = saleId ? `&sale_id=eq.${encodeURIComponent(saleId)}` : '';
    const l = await rest(`pagamento_links?status=eq.ativo&baixa_em=is.null&expira_em=gt.${agoraIso}${filtroNota}&select=*&limit=50`);
    if (!l.ok || !Array.isArray(l.corpo)) throw new Error(`falha ao listar links (${l.status})`);
    const links = l.corpo.filter((k) => TOKEN_RE.test(String(k.token || '')));
    if (links.length === 0) return vazio;

    const chaves = links.map((k) => `"link:${k.token}"`).join(',');
    const p = await rest(`pix_pendentes?sale_id=in.(${encodeURIComponent(chaves)})&status=in.(pendente,pago)&select=id,sale_id,valor_centavos,status,expira_em,criado_em&order=criado_em.desc`);
    if (!p.ok || !Array.isArray(p.corpo)) throw new Error(`falha ao listar pendências (${p.status})`);
    const porToken = new Map();
    for (const pend of p.corpo) {
      const t = String(pend.sale_id).slice(5);
      if (!porToken.has(t)) porToken.set(t, []);
      porToken.get(t).push(pend);
    }

    const resultado = { ...vazio };
    for (const link of links) {
      const lista = porToken.get(link.token) || [];
      const paga = lista.find((x) => x.status === 'pago');
      const aberta = lista.find((x) => x.status === 'pendente' && new Date(x.expira_em).getTime() > Date.now());
      const alvo = paga || aberta;
      if (!alvo) continue; // ninguém escolheu valor neste link: nada a conferir (e nada de Gmail)
      if (!paga) {
        if (Date.now() - inicio > prazoMs) { resultado.completo = false; break; }
        const ultima = ultimaChecagem.get(alvo.id) || 0;
        if (Date.now() - ultima < INTERVALO_MINIMO_MS) { resultado.completo = false; continue; }
        ultimaChecagem.set(alvo.id, Date.now());
        if (ultimaChecagem.size > 500) ultimaChecagem.clear();
        resultado.verificados++;
        let confirmou = false;
        try { confirmou = await verificarPendencia(alvo.id); } catch (err) { console.error('[pagar-link] conferência falhou:', err?.message || err); resultado.completo = false; }
        if (!confirmou) continue;
      }
      const atual = await carregarPendencia(alvo.id);
      const baixou = await darBaixa(link, atual || alvo);
      if (baixou) { resultado.pagos++; resultado.baixadas.push(link.sale_id); }
    }
    return resultado;
  } finally {
    conferindoAgora = false;
  }
}

/**
 * POST /api/ai?rota=pix-aviso — "campainha" chamada pelo Google Apps Script quando chega e-mail novo do Nubank.
 * Não recebe nem confia em nenhum conteúdo do e-mail: só dispara a conferência normal (que lê o Gmail e
 * valida remetente/DKIM). Protegida por segredo compartilhado (variável PIX_WEBHOOK_SECRET, header x-pix-secret).
 * Resposta: { ok, resolvido } — resolvido=false pede que o script toque de novo no próximo ciclo.
 */
export async function handlePixAviso(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const segredo = process.env.PIX_WEBHOOK_SECRET;
  if (!segredo) { res.status(503).json({ ok: false, resolvido: false }); return; }
  const recebido = Buffer.from(String(req.headers['x-pix-secret'] || ''));
  const esperado = Buffer.from(segredo);
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) { res.status(401).json({ ok: false, resolvido: false }); return; }
  try {
    const r = await conferirLinksAbertos();
    res.status(200).json({ ok: true, resolvido: r.completo, pagos: r.pagos });
  } catch (err) {
    console.error('[pix-aviso]', err?.message || err);
    res.status(200).json({ ok: false, resolvido: false });
  }
}

/**
 * POST /api/ai?rota=verificar-notas — chamada pelo CRM (x-user-id): confere os links ativos de uma nota
 * (body { saleId }) ou de todas as notas abertas (sem saleId). Respeita um intervalo mínimo para não martelar o Gmail.
 * Resposta: { ok, pagos, baixadas: [sale_id], recente? }
 */
export async function handleVerificarNotas(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!(await exigirUsuarioAutorizado(req, res))) return;
  const saleId = String(req.body?.saleId || '').trim() || null;
  const chave = saleId || '*';
  if (Date.now() - (ultimaConferenciaCrm.get(chave) || 0) < INTERVALO_MINIMO_CRM_MS) {
    res.status(200).json({ ok: true, pagos: 0, baixadas: [], recente: true });
    return;
  }
  ultimaConferenciaCrm.set(chave, Date.now());
  if (ultimaConferenciaCrm.size > 200) ultimaConferenciaCrm.clear();
  try {
    const r = await conferirLinksAbertos({ saleId });
    res.status(200).json({ ok: true, pagos: r.pagos, baixadas: r.baixadas });
  } catch (err) {
    console.error('[verificar-notas]', err?.message || err);
    res.status(200).json({ ok: false, pagos: 0, baixadas: [] });
  }
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
      // A pendência vale até o vencimento do link (nunca além dele), e não os 30 min padrão da tabela:
      // assim o cliente pode pagar horas depois de escolher o valor e o e-mail ainda será aceito.
      const ins = await rest('pix_pendentes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          company_id: link.company_id,
          sale_id: `link:${token}`,
          valor_centavos: opcao.valor_centavos,
          expira_em: new Date(link.expira_em).toISOString(),
        }),
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
