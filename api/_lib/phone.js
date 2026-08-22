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
