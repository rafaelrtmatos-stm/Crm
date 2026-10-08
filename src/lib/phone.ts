// Normaliza celular brasileiro pro formato canonico 55DDD9XXXXXXXX (13 digitos): mesma regra de
// api/_lib/phone.js (usada pelo webhook), pra o CRM reconhecer como o MESMO contato o telefone gravado
// com/sem "55" e com/sem o nono digito.
export function normalizarTelefoneBR(digitos: string): string {
  if (!digitos) return digitos;
  if (!digitos.startsWith('55') && (digitos.length === 10 || digitos.length === 11)) digitos = `55${digitos}`;
  if (!digitos.startsWith('55')) return digitos; // fora do Brasil, nao mexe
  const resto = digitos.slice(2);
  if (resto.length === 10) {
    const ddd = resto.slice(0, 2);
    const numero = resto.slice(2);
    if (/^[6-9]/.test(numero)) return `55${ddd}9${numero}`;
    return digitos; // provavel fixo
  }
  return digitos;
}

// Chave do CONTATO: so digitos + normalizacao BR. Dois leads com a mesma chave sao a mesma pessoa.
export function chaveDoContato(telefone: string | null | undefined): string {
  return normalizarTelefoneBR((telefone || '').replace(/\D/g, ''));
}

// Todos os formatos em que o MESMO celular brasileiro pode estar gravado: com/sem "55" e com/sem
// o nono digito. Leads antigos foram salvos sem o 9 (ou sem o 55), mas o webhook grava as mensagens
// novas no formato canonico (55DDD9XXXXXXXX) -- buscar pelo telefone EXATO do lead nao encontrava
// essas mensagens. Grupos (JID com ~18 digitos) e numeros de outros paises voltam so com o proprio valor.
export function variantesTelefoneBR(telefone: string | null | undefined): string[] {
  const d = String(telefone || '').replace(/\D/g, '');
  if (!d) return [];
  const canon = normalizarTelefoneBR(d);
  const set = new Set<string>([d]);
  const cel = /^55(\d{2})9([6-9]\d{7})$/.exec(canon);
  if (cel) {
    const [, ddd, num] = cel;
    [`55${ddd}9${num}`, `55${ddd}${num}`, `${ddd}9${num}`, `${ddd}${num}`].forEach((v) => set.add(v));
  } else {
    const fixo = /^55(\d{2})([2-5]\d{7})$/.exec(canon);
    if (fixo) [canon, `${fixo[1]}${fixo[2]}`].forEach((v) => set.add(v));
  }
  return [...set];
}
