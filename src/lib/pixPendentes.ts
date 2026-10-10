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
    const { data, error } = await supabase
      .from('pix_pendentes')
      .insert({ company_id: params.companyId, sale_id: params.saleId ?? null, valor_centavos: params.valorCentavos })
      .select('id, expira_em')
      .single();
    if (error || !data) return null;
    return { id: data.id as string, expiraEm: data.expira_em as string };
  } catch {
    return null;
  }
}

/** Pergunta ao servidor se o PIX dessa pendência já chegou. Só recebe { pago } — nunca o e-mail. */
export async function consultarPixPago(id: string): Promise<boolean> {
  try {
    const r = await fetch('/api/pix-email-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': idUsuarioLogado() },
      body: JSON.stringify({ id }),
    });
    if (!r.ok) return false;
    const j = await r.json();
    return j?.pago === true;
  } catch {
    return false;
  }
}

/**
 * Libera a pendência quando o card fecha sem pagamento, pra ela não ficar "em aberto" por 30 min e
 * impedir a confirmação automática de outra cobrança de mesmo valor. Só mexe se ainda estiver pendente.
 */
export function cancelarPixPendente(id: string): void {
  void supabase.from('pix_pendentes').update({ status: 'expirado' }).eq('id', id).eq('status', 'pendente').then(() => {}, () => {});
}
