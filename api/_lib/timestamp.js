// Converte o messageTimestamp / lastSeen que a Evolution API (Baileys) manda em ISO (UTC).
// Normalmente vem em SEGUNDOS (unix), mas dependendo da versao pode vir em MILISSEGUNDOS ou
// como objeto Long ({ low, high }). Antes era `new Date(Number(ts) * 1000).toISOString()`, que
// gravava data absurda (ms * 1000) ou estourava "Invalid time value" (Long) e derrubava o
// webhook -- a mensagem se perdia. Devolve undefined se nao der pra entender o valor.
export function timestampParaIso(ts) {
  if (ts === null || ts === undefined || ts === '') return undefined;
  let n;
  if (typeof ts === 'object' && ts !== null && 'low' in ts) {
    n = (Number(ts.high) || 0) * 4294967296 + (ts.low >>> 0);
  } else {
    n = Number(ts);
  }
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
