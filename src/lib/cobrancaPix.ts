import { supabase } from '../supabase';
import { PUBLIC_SIGN_BASE_URL } from './companyIdentity';
import { normalizarTelefoneBR } from './phone';
import { buildPixPayload } from './pix';
import type { TipoDescontoPix } from './descontoPix';

// Cobrança e aviso de pagamento por WhatsApp (PIX):
//  - enviarAvisoPagamentoPix: texto curto "pagamento confirmado" ao número da nota (PIX automático);
//  - enviarCobrancaPix: QR Code (imagem) + texto + PIX copia e cola, direto na conversa;
//  - criarLinkPagamento / enviarLinkPagamento: link público /pagar/:token em que o cliente escolhe o valor.
// Tudo passa por /api/whatsapp-send (a chave da Evolution API nunca vai ao navegador). Nenhuma credencial aqui.

export interface PixConfigLite {
  key: string;
  keyType?: any;
  beneficiaryName: string;
  city: string;
  bank?: string;
}

export interface OpcaoCobranca {
  id: string;
  label: string;
  /** Valor FINAL cobrado no Pix (já com o desconto, quando houver). */
  valor_centavos: number;
  /** Só quando há desconto: valor antes do desconto, desconto concedido e como foi definido. */
  valor_original_centavos?: number;
  desconto_centavos?: number;
  desconto_tipo?: TipoDescontoPix;
  /** % (percentual) ou R$ (fixo) digitado por quem cobra. */
  desconto_valor?: number;
}

export const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

/** ISO -> "dd/mm às hh:mm" no horário de Brasília (o mesmo texto no WhatsApp e na página do cliente). */
export function fmtValidade(iso: string | number | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const p = (t: string) => partes.find(x => x.type === t)?.value || '';
  return `${p('day')}/${p('month')} às ${p('hour')}:${p('minute')}`;
}

/** "Maria Aparecida da Silva" -> "Maria S." */
export function abreviarNome(nome?: string | null): string {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Cliente';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

/** "cleiton gama cardoso" -> "Cleiton" (primeiro nome com inicial maiúscula). */
export function primeiroNome(nome?: string | null): string {
  const p = String(nome || '').trim().split(/\s+/)[0] || '';
  if (!p) return 'Cliente';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/** ISO -> "hh:mm" no horário de Brasília; se não for hoje, "dd/mm hh:mm". Vazio se não houver data válida. */
export function fmtHoraPagamento(iso?: string | number | Date | null): string {
  if (iso == null || iso === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const fmt = (data: Date, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(data);
  const hora = fmt(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const diaCompleto = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;
  if (fmt(d, diaCompleto) === fmt(new Date(), diaCompleto)) return hora;
  return `${fmt(d, { day: '2-digit', month: '2-digit' })} ${hora}`;
}

/** Itens da nota em uma linha: "2x Banner, Cartão de visita (+2 itens)". */
export function resumirItens(items: Array<{ name?: string; quantity?: number }> | undefined, max = 3): string {
  const lista = (items || []).filter(i => i && i.name);
  if (lista.length === 0) return 'Pedido';
  const nomes = lista.slice(0, max).map(i => `${i.quantity && i.quantity > 1 ? `${i.quantity}x ` : ''}${i.name}`);
  const resto = lista.length - max;
  return nomes.join(', ') + (resto > 0 ? ` (+${resto} ${resto === 1 ? 'item' : 'itens'})` : '');
}

/** Telefone só com dígitos no formato canônico BR, ou null se não parecer um celular/fixo válido. */
export function telefoneParaEnvio(raw?: string | null): string | null {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length < 10) return null;
  return normalizarTelefoneBR(d);
}

/** Opções padrão de cobrança sobre o restante da nota: metade (entrada) e total. */
export function opcoesPadrao(restante: number): OpcaoCobranca[] {
  const totalCent = Math.round(restante * 100);
  const metadeCent = Math.round(totalCent / 2);
  const lista: OpcaoCobranca[] = [];
  if (metadeCent > 0 && metadeCent < totalCent) lista.push({ id: 'metade', label: 'Entrada 50%', valor_centavos: metadeCent });
  if (totalCent > 0) lista.push({ id: 'total', label: 'Saldo total (quitação à vista)', valor_centavos: totalCent });
  return lista;
}

const idUsuarioLogado = (): string => {
  try {
    const raw = localStorage.getItem('rpro_cached_user');
    return raw ? String(JSON.parse(raw)?.id || '') : '';
  } catch {
    return '';
  }
};

async function postarWhatsApp(body: Record<string, unknown>): Promise<{ ok: boolean; erro?: string }> {
  try {
    const resp = await fetch('/api/whatsapp-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': idUsuarioLogado() },
      body: JSON.stringify(body),
    });
    if (resp.ok) return { ok: true };
    const data = await resp.json().catch(() => ({}));
    return { ok: false, erro: data?.error || 'erro no envio' };
  } catch {
    return { ok: false, erro: 'sem conexão com o servidor' };
  }
}

const numeroDaNota = (orderId?: string) => (orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : '');

const ROTULO_PAGAMENTO: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_debito: 'Cartão de Débito',
  cartao_credito: 'Cartão de Crédito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  crediario: 'Crediário',
};

/** Texto do aviso de pagamento: itens, cada pagamento (PIX/Dinheiro/...), total pago e o que falta. */
export function montarMensagemPagamento(p: {
  customerName?: string | null;
  valor: number;
  itens?: Array<{ name?: string; quantity?: number; price?: number }>;
  total: number;
  pagamentos?: Array<{ method?: string; value?: number; date?: string; discount?: number; originalValue?: number }>;
  pago?: number;
  orderId?: string;
}): string {
  const nome = primeiroNome(p.customerName);
  const itens = (p.itens || []).filter(i => i && i.name);
  let pagamentos: Array<{ metodo: string; valor: number; data?: string; desconto?: number; original?: number }> = (p.pagamentos || [])
    .filter(x => Number(x.value) > 0)
    .map(x => ({ metodo: String(x.method || 'pix'), valor: Number(x.value), data: x.date, desconto: Number(x.discount) > 0 ? Number(x.discount) : 0, original: Number(x.originalValue) || 0 }));
  if (pagamentos.length === 0) {
    // Nota sem lista de pagamentos: o que veio antes do PIX atual é tratado como dinheiro (sem hora conhecida).
    const anterior = Math.max(0, Math.round(((p.pago ?? p.valor) - p.valor) * 100) / 100);
    if (anterior > 0.009) pagamentos.push({ metodo: 'dinheiro', valor: anterior });
    pagamentos.push({ metodo: 'pix', valor: p.valor, data: new Date().toISOString() });
  }
  // O que a nota realmente recebeu (down_payment) manda; a soma da lista só vale quando esse valor não foi informado.
  const somaLista = Math.round(pagamentos.reduce((a, x) => a + x.valor, 0) * 100) / 100;
  const totalPago = p.pago != null && Number.isFinite(Number(p.pago)) ? Math.round(Number(p.pago) * 100) / 100 : somaLista;
  const falta = Math.max(0, Math.round((p.total - totalPago) * 100) / 100);
  const nota = numeroDaNota(p.orderId);
  const linhas = [
    '✅ Pagamento confirmado!',
    '',
    `Olá, ${nome}! Recebemos seu PIX de ${fmtBRL(p.valor)}`,
    '',
  ];
  if (nota) linhas.push(`Pedido ${nota}`);
  for (const i of itens) {
    const qtd = Number(i.quantity) || 1;
    linhas.push(`* ${qtd}x ${i.name} (${fmtBRL((Number(i.price) || 0) * qtd)})`);
  }
  linhas.push('', `💰 Total do pedido: ${fmtBRL(p.total)}`);
  for (const x of pagamentos) {
    const hora = fmtHoraPagamento(x.data);
    linhas.push(`💵 ${ROTULO_PAGAMENTO[x.metodo] || x.metodo}${hora ? ` (${hora})` : ''}: ${fmtBRL(x.valor)}`);
    if (x.desconto && x.desconto > 0) linhas.push(`🏷️ Desconto Pix: -${fmtBRL(x.desconto)}${x.original ? ` (valor original ${fmtBRL(x.original)})` : ''}`);
  }
  linhas.push(`✅ Total pago: ${fmtBRL(totalPago)}`);
  linhas.push(falta > 0.009 ? `🔴 Falta pagar: ${fmtBRL(falta)}` : '🟢 Pedido quitado!');
  linhas.push('', 'Obrigado pela preferência! Equipe Rafa Arts Graphics agradece.');
  return linhas.join('\n');
}

/** Aviso de PIX confirmado ao número da nota. Nunca lança erro; devolve true se foi enviado. */
export async function enviarAvisoPagamentoPix(p: {
  phone?: string | null;
  customerName?: string | null;
  valor: number;
  itens?: Array<{ name?: string; quantity?: number; price?: number }>;
  orderId?: string;
  restante?: number;
  total?: number;
  pagamentos?: Array<{ method?: string; value?: number; date?: string }>;
  pago?: number;
}): Promise<boolean> {
  const phone = telefoneParaEnvio(p.phone);
  if (!phone) return false;
  let texto: string;
  if (p.total != null && p.total > 0) {
    texto = montarMensagemPagamento({ customerName: p.customerName, valor: p.valor, itens: p.itens, total: p.total, pagamentos: p.pagamentos, pago: p.pago, orderId: p.orderId });
  } else {
    const linhas = [
      '✅ *Pagamento PIX confirmado*',
      `Cliente: ${String(p.customerName || '').trim() || 'Cliente'}`,
      `Valor: ${fmtBRL(p.valor)}`,
      `Referente a: ${resumirItens(p.itens)}`,
    ];
    const nota = numeroDaNota(p.orderId);
    if (nota) linhas.push(`Nota ${nota}`);
    linhas.push(p.restante && p.restante > 0.009 ? `Restante: ${fmtBRL(p.restante)}` : 'Nota quitada. Obrigado!');
    texto = linhas.join('\n');
  }
  const r = await postarWhatsApp({ phone, text: texto, senderName: 'Sistema' });
  if (!r.ok) console.warn('Aviso de pagamento PIX não enviado:', r.erro);
  return r.ok;
}

/** Envia a cobrança na conversa: QR Code como imagem (com legenda) + PIX copia e cola em mensagem separada. */
export async function enviarCobrancaPix(p: {
  phone: string;
  customerName?: string | null;
  itens?: Array<{ name?: string; quantity?: number }>;
  orderId?: string;
  valor: number;
  pix: PixConfigLite;
}): Promise<{ ok: boolean; erro?: string }> {
  const phone = telefoneParaEnvio(p.phone);
  if (!phone) return { ok: false, erro: 'Telefone inválido.' };
  const payload = buildPixPayload({
    key: p.pix.key,
    keyType: p.pix.keyType,
    beneficiaryName: p.pix.beneficiaryName,
    city: p.pix.city,
    amount: Number(p.valor.toFixed(2)),
  });
  const nota = numeroDaNota(p.orderId);
  const legenda = [
    '💳 *Cobrança via PIX*',
    `Olá, ${abreviarNome(p.customerName)}! Segue o pagamento referente a: ${resumirItens(p.itens)}`,
    `Valor: ${fmtBRL(p.valor)}${nota ? ` · Nota ${nota}` : ''}`,
    '',
    'Pague lendo o QR Code abaixo ou use o PIX copia e cola da próxima mensagem.',
  ].join('\n');

  let enviouImagem = false;
  try {
    const QRCode = (await import('qrcode')).default;
    const dataUrl = await QRCode.toDataURL(payload, { margin: 2, width: 600, errorCorrectionLevel: 'M' });
    const blob = await (await fetch(dataUrl)).blob();
    const caminho = `enviados/${phone}/${Date.now()}-pix.png`;
    const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(caminho, blob, { contentType: 'image/png', upsert: false });
    if (!upErr) {
      const { data: pub } = supabase.storage.from('whatsapp-media').getPublicUrl(caminho);
      if (pub?.publicUrl) {
        const r = await postarWhatsApp({
          phone, mediaUrl: pub.publicUrl, mediaType: 'image', fileName: 'pix.png', mimeType: 'image/png', text: legenda, senderName: 'Sistema',
        });
        enviouImagem = r.ok;
      }
    }
  } catch (e) {
    console.warn('QR Code não enviado como imagem; seguindo só com texto:', e);
  }
  if (!enviouImagem) {
    const r = await postarWhatsApp({ phone, text: legenda, senderName: 'Sistema' });
    if (!r.ok) return { ok: false, erro: r.erro };
  }
  const r2 = await postarWhatsApp({ phone, text: payload, senderName: 'Sistema' });
  return r2.ok ? { ok: true } : { ok: false, erro: r2.erro };
}

/** Legenda da cobrança PIX (QR + copia e cola). Usada no envio direto e no rascunho da caixa de mensagem. */
function montarLegendaCobrancaPix(p: {
  customerName?: string | null;
  itens?: Array<{ name?: string; quantity?: number }>;
  orderId?: string;
  valor: number;
  /** Valor antes do desconto e desconto concedido (só quando houver desconto). */
  valorOriginal?: number;
  desconto?: number;
}, instrucao: string): string {
  const nota = numeroDaNota(p.orderId);
  const comDesconto = (p.desconto ?? 0) > 0.009 && (p.valorOriginal ?? 0) > 0;
  const linhasValor = comDesconto
    ? [
      `Valor original: ${fmtBRL(p.valorOriginal as number)}`,
      `🏷️ Desconto no Pix: -${fmtBRL(p.desconto as number)}`,
      `Valor a pagar: ${fmtBRL(p.valor)}${nota ? ` · Nota ${nota}` : ''}`,
    ]
    : [`Valor: ${fmtBRL(p.valor)}${nota ? ` · Nota ${nota}` : ''}`];
  return [
    '💳 *Cobrança via PIX*',
    `Olá, ${abreviarNome(p.customerName)}! Segue o pagamento referente a: ${resumirItens(p.itens)}`,
    ...linhasValor,
    '',
    instrucao,
  ].join('\n');
}

/**
 * Prepara a cobrança PIX SEM enviar nada: gera o QR (PNG) e a legenda para cair na CAIXA DE MENSAGEM da conversa
 * (setPendingReceiptAttachment + openWhatsAppChat), como recibo/orçamento. O copia e cola NAO entra na legenda: sai em uma 2a mensagem de texto,
 * logo depois da imagem. Quem envia é o usuário.
 */
export async function prepararCobrancaPix(p: {
  customerName?: string | null;
  itens?: Array<{ name?: string; quantity?: number }>;
  orderId?: string;
  /** Valor FINAL cobrado (já com desconto). O QR Code e o copia e cola usam exatamente este valor. */
  valor: number;
  pix: PixConfigLite;
  expiraEm?: Date;
  /** Quando há desconto: valor original e desconto (informativos na legenda; o QR usa `valor`). */
  valorOriginal?: number;
  desconto?: number;
}): Promise<{ ok: true; file: File; previewUrl: string; legenda: string; payload: string; valorCentavos: number } | { ok: false; erro: string }> {
  try {
    const payload = buildPixPayload({
      key: p.pix.key,
      keyType: p.pix.keyType,
      beneficiaryName: p.pix.beneficiaryName,
      city: p.pix.city,
      amount: Number(p.valor.toFixed(2)),
    });
    const QRCode = (await import('qrcode')).default;
    const dataUrl = await QRCode.toDataURL(payload, { margin: 2, width: 600, errorCorrectionLevel: 'M' });
    const blob = await (await fetch(dataUrl)).blob();
    // Nome unico: a caixa de mensagem descarta anexos com o mesmo nome (uma segunda cobranca seria ignorada).
    const file = new File([blob], `pix-qrcode-${Date.now()}.png`, { type: 'image/png' });
    const previewUrl = URL.createObjectURL(blob);
    // Legenda SO descreve a cobranca; o copia e cola vai em mensagem de texto separada (ver Modules.tsx, enviarImagensPendentes).
    const validade = p.expiraEm ? `\nVálido até ${fmtValidade(p.expiraEm)}.` : '';
    const legenda = montarLegendaCobrancaPix(p, `Pague lendo o QR Code acima. O código PIX copia e cola segue na próxima mensagem.${validade}`);
    return { ok: true, file, previewUrl, legenda, payload, valorCentavos: Math.round(Number(p.valor.toFixed(2)) * 100) };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'não foi possível gerar o QR Code' };
  }
}

const tokenAleatorio = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

/** Cria o link público de pagamento (tabela pagamento_links — ver supabase/create_pagamento_links.sql). */
export async function criarLinkPagamento(p: {
  companyId: string;
  saleId: string;
  customerName?: string | null;
  phone?: string | null;
  itens?: Array<{ name?: string; quantity?: number }>;
  totalCentavos: number;
  restanteCentavos: number;
  opcoes: OpcaoCobranca[];
  pix: PixConfigLite;
  /** Validade em horas a partir de agora (padrão 72 h). Ignorada se `expiraEmData` for informada. */
  validadeHoras?: number;
  /** Data/hora exata em que o link vence. */
  expiraEmData?: Date;
}): Promise<{ ok: boolean; url?: string; expiraEm?: string; erro?: string }> {
  if (p.opcoes.length === 0) return { ok: false, erro: 'Escolha ao menos uma opção de valor.' };
  for (const o of p.opcoes) {
    const desc = o.desconto_centavos ?? 0;
    const original = o.valor_centavos + desc;
    // Coerência: valor_centavos é SEMPRE o valor final; se há desconto, o original gravado precisa ser final + desconto
    // (assim o desconto nunca é aplicado duas vezes nem some do histórico).
    if (desc > 0 && o.valor_original_centavos != null && o.valor_original_centavos !== original) {
      return { ok: false, erro: `Valor inválido na opção "${o.label}": original, desconto e valor final não conferem.` };
    }
    if (!(o.valor_centavos > 0) || desc < 0 || original > p.restanteCentavos || (desc > 0 && original !== p.restanteCentavos)) {
      return { ok: false, erro: `Valor inválido na opção "${o.label}": o desconto só vale no pagamento integral do saldo e não pode zerar o Pix.` };
    }
  }
  const token = tokenAleatorio();
  const venceEm = p.expiraEmData ?? new Date(Date.now() + (p.validadeHoras ?? 72) * 60 * 60 * 1000);
  if (Number.isNaN(venceEm.getTime()) || venceEm.getTime() <= Date.now()) return { ok: false, erro: 'A validade do link precisa ser uma data futura.' };
  const expiraEm = venceEm.toISOString();
  const { error } = await supabase.from('pagamento_links').insert({
    token,
    company_id: p.companyId,
    sale_id: p.saleId,
    cliente_nome: abreviarNome(p.customerName),
    cliente_phone: telefoneParaEnvio(p.phone),
    resumo: resumirItens(p.itens),
    total_centavos: p.totalCentavos,
    restante_centavos: p.restanteCentavos,
    opcoes: p.opcoes,
    pix: { key: p.pix.key, keyType: p.pix.keyType ?? null, beneficiaryName: p.pix.beneficiaryName, city: p.pix.city, bank: p.pix.bank ?? null },
    expira_em: expiraEm,
    criado_por: idUsuarioLogado() || null,
  });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, url: `${PUBLIC_SIGN_BASE_URL}/pagar/${token}`, expiraEm };
}

/** Texto do link de pagamento (o mesmo no envio direto e no rascunho da caixa de mensagem). */
export function montarTextoLinkPagamento(p: {
  customerName?: string | null;
  itens?: Array<{ name?: string; quantity?: number }>;
  opcoes: OpcaoCobranca[];
  url: string;
  /** ISO do vencimento do link — vira "Válido até dd/mm às hh:mm" na mensagem. */
  expiraEm?: string;
}): string {
  const opcoesTxt = p.opcoes.map(o => (o.desconto_centavos ?? 0) > 0
    ? `• ${o.label}: ${fmtBRL((o.valor_original_centavos ?? o.valor_centavos + (o.desconto_centavos ?? 0)) / 100)} → ${fmtBRL(o.valor_centavos / 100)} (desconto de ${fmtBRL((o.desconto_centavos ?? 0) / 100)} no Pix)`
    : `• ${o.label}: ${fmtBRL(o.valor_centavos / 100)}`).join('\n');
  const validade = p.expiraEm ? fmtValidade(p.expiraEm) : '';
  return [
    '💳 *Link de pagamento*',
    `Olá, ${abreviarNome(p.customerName)}! Segue o link para pagar sua nota referente a: ${resumirItens(p.itens)}`,
    '',
    'Você escolhe a opção na página:',
    opcoesTxt,
    '',
    ...(validade ? [`⏳ Válido até ${validade}`] : []),
    `👉 ${p.url}`,
  ].join('\n');
}

/** Manda o link de pagamento direto na conversa do cliente (envio automático; o modal não usa mais). */
export async function enviarLinkPagamento(p: {
  phone: string;
  customerName?: string | null;
  itens?: Array<{ name?: string; quantity?: number }>;
  opcoes: OpcaoCobranca[];
  url: string;
  expiraEm?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const phone = telefoneParaEnvio(p.phone);
  if (!phone) return { ok: false, erro: 'Telefone inválido.' };
  const texto = montarTextoLinkPagamento(p);
  return postarWhatsApp({ phone, text: texto, senderName: 'Sistema' });
}
