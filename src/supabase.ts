import { createClient } from '@supabase/supabase-js';

// Projeto Supabase dedicado deste CRM (Rafa Arts Graphics).
// Separado do Supabase usado pelo Rumo ao Milhão (RA1M).
const SUPABASE_URL = 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Busca TODAS as linhas de uma tabela, paginando em blocos (o Supabase/PostgREST
// limita cada resposta a no maximo 1000 linhas por padrao nas configuracoes do projeto,
// entao pedir .limit(2000) direto na query nao adianta — precisa paginar com .range()).
// Use isso em qualquer lugar que precise carregar a tabela inteira (ex: lista de clientes),
// em vez de um select('*') simples que silenciosamente corta em 1000 registros.
export async function fetchAllRows<T = any>(
  table: string,
  select: string = '*',
  opts?: {
    orderBy?: string;
    ascending?: boolean;
    filters?: (query: any) => any;
    pageSize?: number;
  }
): Promise<T[]> {
  const pageSize = opts?.pageSize || 1000;
  const orderBy = opts?.orderBy || 'id';
  const ascending = opts?.ascending !== false;
  let from = 0;
  const all: T[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).select(select).order(orderBy, { ascending });
    if (opts?.filters) query = opts.filters(query);
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
