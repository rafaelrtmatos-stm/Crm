/**
 * O Supabase devolve no máximo 1.000 linhas por consulta. Quem faz um
 * `select('*')` simples numa tabela maior que isso recebe só as primeiras
 * 1.000 e o resto "some" da tela. Este helper busca página por página até
 * acabar.
 *
 * Use sempre com `.order(...)` estável (de preferência terminando em
 * `.order('id')`), senão as páginas podem repetir ou pular linhas.
 *
 * Exemplo:
 *   const { data, error } = await fetchAllRows((from, to) =>
 *     supabase.from('clientes').select('*').order('full_name').order('id').range(from, to)
 *   );
 */
export async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<{ data: T[]; error: any }> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return { data: all, error: null };
}
