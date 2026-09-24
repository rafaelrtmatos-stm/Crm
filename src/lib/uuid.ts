// Validacao de UUID no formato que o Postgres aceita (8-4-4-4-12 hexadecimal), sem exigir versao especifica.
// Um valor fora desse formato numa coluna `uuid` faz o PostgREST responder 400 (erro 22P02, "invalid input
// syntax for type uuid"), entao vale filtrar ANTES de montar a consulta. Nao restringimos a UUIDv4: os ids
// do banco podem vir de outras versoes (v1/v7 etc.) e recusar um id valido esconderia dados sem necessidade.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ehUuid = (valor: unknown): valor is string => typeof valor === 'string' && UUID_RE.test(valor);
