import { supabase } from '../supabase';
import { PUBLIC_SIGN_BASE_URL } from './companyIdentity';
import { normalizarTelefoneBR } from './phone';
import { buildPixPayload } from './pix';

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
  valor_centavos: number;
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
  if (totalCent > 0) lista.push({ id: 'total', label: 'Valor total', valor_centavos: totalCent });
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

/** Aviso de PIX confirmado ao número da nota. Nunca lança erro; devolve true se foi enviado. */
export async function enviarAvisoPagamentoPix(p: {
  phone?: string | null;
  customerName?: string | null;
  valor: number;
  itens?: Array<{ name?: string; quantity?: number }>;
  orderId?: string;
  restante?: number;
}): Promise<boolean> {
  const phone = telefoneParaEnvio(p.phone);
  if (!phone) return false;
  const linhas = [
    '✅ *Pagamento PIX confirmado*',
    `Cliente: ${abreviarNome(p.customerName)}`,
    `Valor: ${fmtBRL(p.valor)}`,
    `Referente a: ${resumirItens(p.itens)}`,
  ];
  const nota = numeroDaNota(p.orderId);
  if (nota) linhas.push(`Nota ${nota}`);
  linhas.push(p.restante && p.restante > 0.009 ? `Restante: ${fmtBRL(p.restante)}` : 'Nota quitada. Obrigado!');
  const r = await postarWhatsApp({ phone, text: linhas.join('\n'), senderName: 'Sistema' });
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

/** Manda o link de pagamento na conversa do cliente. */
export async function enviarLinkPagamento(p: {
  phone: string;
  customerName?: string | null;
  itens?: Array<{ name?: string; quantity?: number }>;
  opcoes: OpcaoCobranca[];
  url: string;
  /** ISO do vencimento do link — vira "Válido até dd/mm às hh:mm" na mensagem. */
  expiraEm?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const phone = telefoneParaEnvio(p.phone);
  if (!phone) return { ok: false, erro: 'Telefone inválido.' };
  const opcoesTxt = p.opcoes.map(o => `• ${o.label}: ${fmtBRL(o.valor_centavos / 100)}`).join('\n');
  const validade = p.expiraEm ? fmtValidade(p.expiraEm) : '';
  const texto = [
    '💳 *Link de pagamento*',
    `Olá, ${abreviarNome(p.customerName)}! Segue o link para pagar sua nota referente a: ${resumirItens(p.itens)}`,
    '',
    'Você escolhe a opção na página:',
    opcoesTxt,
    '',
    ...(validade ? [`⏳ Válido até ${validade}`] : []),
    `👉 ${p.url}`,
  ].join('\n');
  return postarWhatsApp({ phone, text: texto, senderName: 'Sistema' });
}
