// Normaliza celular brasileiro pro formato canonico 55DDD9XXXXXXXX (13 digitos): mesma regra de
// api/_lib/phone.js (usada pelo webhook), pra o CRM reconhecer como o MESMO contato o telefone gravado
// com/sem "55" e com/sem o nono digito.
// `assumirBrasil: false` = o numero ja veio com DDI: so completa o nono digito de numero 55..., nunca acrescenta "55".
// Numero dos EUA/Canada com DDI ("1" + 10 digitos) tambem nao e tratado como brasileiro.
export function normalizarTelefoneBR(digitos: string, { assumirBrasil = true }: { assumirBrasil?: boolean } = {}): string {
  if (!digitos) return digitos;
  const pareceNanp = digitos.length === 11 && digitos.startsWith('1') && digitos[2] !== '9';
  if (assumirBrasil && !pareceNanp && !digitos.startsWith('55') && (digitos.length === 10 || digitos.length === 11)) digitos = `55${digitos}`;
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

// Telefone pra EXIBIR em documento (recibo): "+55(93) 99233-2012". Aceita com/sem "+55", com/sem formatacao,
// e conserta o "55" duplicado ("+55 5593992332012" = DDI + numero gravado ja com 55). Numero que nao parece
// brasileiro (outro pais, grupo, texto) volta exatamente como veio.
export function formatarTelefoneExibicao(valor: string | null | undefined): string {
  const original = String(valor || '').trim();
  let d = original.replace(/\D/g, '');
  if (!d) return original;
  // 55 duplicado: o legitimo "55 + DDD 55 + celular" tem 13 digitos (12 fixo); duplicado tem 15 (14 fixo).
  if (d.startsWith('5555') && d.length >= 14) d = d.slice(2);
  let nacional: string;
  if (d.length === 10 || d.length === 11) {
    const pareceNanp = d.length === 11 && d.startsWith('1') && d[2] !== '9';
    if (pareceNanp) return original;
    nacional = d;
  } else if ((d.length === 12 || d.length === 13) && d.startsWith('55')) {
    nacional = d.slice(2);
  } else {
    return original;
  }
  const ddd = nacional.slice(0, 2);
  const numero = nacional.slice(2);
  const corte = numero.length === 9 ? 5 : 4;
  return `+55(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
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

// Nome que NAO e um nome de verdade (vazio, "Cliente", "Contato sem nome" ou so numero de telefone).
// Serve pra decidir se o nome do WhatsApp pode preencher o Nome Principal do lead na primeira resposta.
export function nomeEhPlaceholder(nome: string | null | undefined): boolean {
  const n = (nome || '').trim();
  if (!n) return true;
  if (/^(cliente|contato|contato sem nome|cliente de balc[aã]o)$/i.test(n)) return true;
  return /^\+?[\d\s()-]+$/.test(n);
}
