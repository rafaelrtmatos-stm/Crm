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
