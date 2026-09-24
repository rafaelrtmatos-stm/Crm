// Status de entrega/leitura de mensagem enviada (os "tiques" do WhatsApp).
// Baileys/Evolution: 0 ERROR, 1 PENDING, 2 SERVER_ACK, 3 DELIVERY_ACK, 4 READ, 5 PLAYED
// (ou o nome em texto). Normaliza tudo pra: 'sent' | 'delivered' | 'read' | null.
//  - sent      = chegou no servidor do WhatsApp (1 tique cinza)
//  - delivered = chegou no celular do cliente (2 tiques cinza)
//  - read      = cliente leu / ouviu o audio (2 tiques azuis)
// PENDING/ERROR viram null (ainda nao ha o que mostrar).

const RANK = { sent: 1, delivered: 2, read: 3 };

export function normalizarStatusEntrega(bruto) {
  if (bruto === null || bruto === undefined || bruto === '') return null;
  const texto = String(bruto).trim().toUpperCase();
  if (/^\d+$/.test(texto)) {
    const n = Number(texto);
    if (n === 2) return 'sent';
    if (n === 3) return 'delivered';
    if (n === 4 || n === 5) return 'read';
    return null;
  }
  if (texto === 'SERVER_ACK' || texto === 'SENT') return 'sent';
  if (texto === 'DELIVERY_ACK' || texto === 'DELIVERED') return 'delivered';
  if (texto === 'READ' || texto === 'PLAYED') return 'read';
  return null;
}

// Status "mais avancado" entre varios (o status so sobe, nunca volta).
export function statusMaisAvancado(lista) {
  let melhor = null;
  for (const bruto of lista) {
    const s = normalizarStatusEntrega(bruto);
    if (s && (!melhor || RANK[s] > RANK[melhor])) melhor = s;
  }
  return melhor;
}

// Valores que ainda podem ser SUBSTITUÍDOS por `novo` (null = sem status ainda).
export function statusesSubstituiveis(novo) {
  if (novo === 'read') return ['sent', 'delivered'];
  if (novo === 'delivered') return ['sent'];
  return [];
}
