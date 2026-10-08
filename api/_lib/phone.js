// Normaliza numero de celular brasileiro pro formato canonico 55DDD9XXXXXXXX
// (13 digitos) — adiciona o codigo do pais (55) quando ele nao vem, e o nono
// digito quando o numero e de celular e ainda nao tem ele.
//
// Antes essa logica so existia dentro de api/whatsapp-webhook.js (usada pra
// numero RECEBIDO da Evolution API). O envio (api/whatsapp-send.js) mandava o
// telefone praticamente cru pra Evolution, sem essa normalizacao — se o lead
// tivesse o telefone salvo sem o "55" na frente (ex: digitado manualmente, sem
// vir do proprio WhatsApp), a Evolution recusava o envio dizendo que o numero
// "nao existe" (exists: false), mesmo o numero sendo real.
//
// Extraida aqui pra api/whatsapp-send.js e api/whatsapp-import-history.js
// tambem poderem normalizar antes de mandar pra Evolution API, sem duplicar a
// funcao em 3 arquivos.
export function normalizarTelefoneBR(digitos) {
  if (!digitos) return digitos;

  // Sem o "55" na frente — assume Brasil se tiver o formato certo (DDD + numero
  // de 8 ou 9 digitos = 10 ou 11 digitos no total) e adiciona o "55" antes de
  // seguir com o resto da normalizacao. Numeros de outros paises normalmente tem
  // tamanho diferente e nao caem nesse caso (ficam do jeito que vieram).
  if (!digitos.startsWith('55') && (digitos.length === 10 || digitos.length === 11)) {
    digitos = `55${digitos}`;
  }

  if (!digitos.startsWith('55')) return digitos; // fora do Brasil, nao mexe
  const resto = digitos.slice(2); // tudo depois do "55"
  if (resto.length === 10) {
    // DDD (2) + numero de 8 digitos (sem o "9") -- so celular tem o nono digito,
    // fixo continua com 8 (nao insere "9" em numero que comeca com 2,3,4 ou 5,
    // que sao prefixos de linha fixa no Brasil)
    const ddd = resto.slice(0, 2);
    const numero = resto.slice(2);
    if (/^[6-9]/.test(numero)) {
      return `55${ddd}9${numero}`;
    }
    return digitos; // provavel fixo, mantem como esta
  }
  return digitos; // ja tem 13 digitos (com "9") ou formato nao reconhecido
}

// Todos os formatos em que o MESMO celular brasileiro pode estar gravado: com/sem "55" e com/sem
// o nono digito. Leads antigos foram salvos sem o 9 (ou sem o 55), mas o webhook grava as mensagens
// novas no formato canonico (55DDD9XXXXXXXX) -- buscar pelo telefone EXATO do lead nao encontrava
// essas mensagens. Grupos (JID com ~18 digitos) e numeros de outros paises voltam so com o proprio valor.
export function variantesTelefoneBR(telefone) {
  const d = String(telefone || '').replace(/\D/g, '');
  if (!d) return [];
  const canon = normalizarTelefoneBR(d);
  const set = new Set([d]);
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
