import { supabase } from '../supabase';

// Confirmação automática de PIX (Nubank) por e-mail — lado do navegador.
// O card de PIX registra uma pendência em `pix_pendentes` ao abrir e consulta /api/pix-email-check
// a cada poucos segundos. Qualquer falha aqui é silenciosa: o botão manual continua funcionando.

export const INTERVALO_CONSULTA_PIX_MS = 8000;

export interface PixPendente {
  id: string;
  /** ISO — a consulta para sozinha depois disso (a pendência expira em 30 min). */
  expiraEm: string;
}

/** Id do usuário logado (mesmo cache local usado pelo login em App.tsx), exigido pela rota. */
const idUsuarioLogado = (): string => {
  try {
    const raw = localStorage.getItem('rpro_cached_user');
    return raw ? String(JSON.parse(raw)?.id || '') : '';
  } catch {
    return '';
  }
};

export async function registrarPixPendente(params: {
  companyId: string;
  saleId?: string | null;
  valorCentavos: number;
}): Promise<PixPendente | null> {
  try {
    const base = { company_id: params.companyId, sale_id: params.saleId ?? null, valor_centavos: params.valorCentavos };
    // criado_por permite ao servidor avisar o cliente por WhatsApp; se a coluna ainda não existe, registra sem ela.
    let res = await supabase.from('pix_pendentes').insert({ ...base, criado_por: idUsuarioLogado() || null }).select('id, expira_em').single();
    if (res.error) res = await supabase.from('pix_pendentes').insert(base).select('id, expira_em').single();
    if (res.error || !res.data) return null;
    return { id: res.data.id as string, expiraEm: res.data.expira_em as string };
  } catch {
    return null;
  }
}

/**
 * Validade (`expiraEm`) escolhida por quem cobra, igual a do link de pagamento: depois dela a pendencia expira e nao confirma mais.
 * Registra, NO MOMENTO EM QUE A COBRANCA FOI ENVIADA pelo WhatsApp, a pendencia em `pix_pendentes` (sale_id + valor).
 * E o mesmo registro do card: quem confirma e da a baixa continua sendo o servidor (pix-aviso -> conferirPendenciasCard,
 * em api/_lib/pagar-link.js, que le o e-mail do Nubank e usa a trava `baixa_em`). Enviar a mensagem NAO e pagamento.
 * Reenvio da mesma cobranca (mesma nota e valor): a pendencia anterior e liberada, pra nao haver 2 abertas com o mesmo
 * valor (a regra de casamento recusa a baixa automatica quando ha mais de uma).
 */
export async function registrarPixPendenteDaCobranca(params: {
  companyId: string;
  saleId: string;
  /** Valor FINAL cobrado no Pix (é o que o e-mail do banco vai trazer). */
  valorCentavos: number;
  expiraEm: string;
  /** Desconto concedido (em centavos) sobre o valor original; a baixa na nota usa isso para quitar o saldo. */
  descontoCentavos?: number;
  descontoTipo?: 'percentual' | 'fixo';
  descontoValor?: number;
}): Promise<PixPendente | null> {
  try {
    await supabase.from('pix_pendentes').update({ status: 'expirado' })
      .eq('company_id', params.companyId).eq('sale_id', params.saleId)
      .eq('valor_centavos', params.valorCentavos).eq('status', 'pendente').is('baixa_em', null);
    const base = {
      company_id: params.companyId,
      sale_id: params.saleId,
      valor_centavos: params.valorCentavos,
      expira_em: params.expiraEm,
    };
    const desc = Math.max(0, Math.round(params.descontoCentavos ?? 0));
    const comDesconto: Record<string, unknown> = desc > 0
      ? { desconto_centavos: desc, desconto_tipo: params.descontoTipo ?? null, desconto_valor: params.descontoValor ?? null }
      : {};
    const criadoPor = { criado_por: idUsuarioLogado() || null };
    const tentativas: Array<Record<string, unknown>> = [{ ...base, ...comDesconto, ...criadoPor }, { ...base, ...comDesconto }];
    let res: any = null;
    for (const corpo of tentativas) {
      res = await supabase.from('pix_pendentes').insert(corpo).select('id, expira_em').single();
      if (!res.error) break;
    }
    // Colunas de desconto ainda não criadas (supabase/add_desconto_pix.sql): NÃO registra sem elas, senão a baixa
    // automática quitaria só o valor com desconto e deixaria o saldo aberto. O operador confirma manualmente.
    if (!res || res.error || !res.data) return null;
    return { id: res.data.id as string, expiraEm: res.data.expira_em as string };
  } catch {
    return null;
  }
}

/**
 * Trava de baixa compartilhada com o servidor: devolve true se ESTE navegador deve dar a baixa, false se o servidor
 * já a deu (nesse caso o navegador só atualiza a tela). Em qualquer falha devolve true (comportamento antigo).
 */
export async function reivindicarBaixaPix(id: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('pix_pendentes')
      .update({ baixa_em: new Date().toISOString() })
      .eq('id', id)
      .is('baixa_em', null)
      .select('id');
    if (error) return true;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return true;
  }
}

/** Pergunta ao servidor se o PIX dessa pendência já chegou. Só recebe { pago } — nunca o e-mail. */
export const TIMEOUT_CONSULTA_PIX_MS = 15000;

export async function consultarPixPago(id: string): Promise<{ pago: boolean; pagador: string | null }> {
  // Timeout: uma requisição pendurada nunca pode travar o laço de consultas do card.
  const controle = new AbortController();
  const corte = setTimeout(() => controle.abort(), TIMEOUT_CONSULTA_PIX_MS);
  try {
    const r = await fetch('/api/pix-email-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': idUsuarioLogado() },
      body: JSON.stringify({ id }),
      signal: controle.signal,
    });
    if (!r.ok) return { pago: false, pagador: null };
    const j = await r.json();
    return { pago: j?.pago === true, pagador: typeof j?.pagador === 'string' && j.pagador.trim() ? j.pagador.trim() : null };
  } catch {
    return { pago: false, pagador: null };
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Libera a pendência quando o card fecha sem pagamento, pra ela não ficar "em aberto" por 30 min e
 * impedir a confirmação automática de outra cobrança de mesmo valor. Só mexe se ainda estiver pendente.
 */
export function cancelarPixPendente(id: string): void {
  void supabase.from('pix_pendentes').update({ status: 'expirado' }).eq('id', id).eq('status', 'pendente').then(() => {}, () => {});
}
