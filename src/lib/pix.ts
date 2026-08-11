// Gerador de payload PIX (BR Code / "Copia e Cola") no padrão EMV do Banco Central.
// Referência: Manual de Padrões para Iniciação do Pix (BCB).

function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

// Remove acentos e caracteres não suportados pelo padrão EMV (apenas ASCII básico)
function sanitize(text: string, maxLength: number): string {
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase();
  return clean.substring(0, maxLength) || 'NA';
}

// CRC16-CCITT (0xFFFF), polinômio 0x1021 — exigido no final do payload PIX
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadInput {
  key: string;
  keyType?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  beneficiaryName: string;
  city: string;
  amount?: number; // se omitido, gera um QR sem valor fixo (cliente digita)
  txid?: string; // identificador da transação, opcional
}

// Chave tipo telefone exige o formato +55DDDNUMERO (E.164) no payload — normaliza
// independente de como a pessoa digitou (com ou sem +55, com ou sem formatação)
function normalizePixKey(key: string, keyType?: string): string {
  if (keyType !== 'telefone') return key.trim();
  const digits = key.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`; // DDD + numero, sem o 55
  if (digits.length === 12 || digits.length === 13) return `+${digits}`; // ja tem o 55 na frente
  return key.trim(); // formato nao reconhecido, manda como veio pra nao quebrar
}

export function buildPixPayload({ key, keyType, beneficiaryName, city, amount, txid }: PixPayloadInput): string {
  const normalizedKey = normalizePixKey(key, keyType);
  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizedKey);
  const additionalData = tlv('05', (txid && txid.trim()) || '***');

  let payload =
    tlv('00', '01') + // Payload Format Indicator
    tlv('26', merchantAccountInfo) + // Merchant Account Information (chave Pix)
    tlv('52', '0000') + // Merchant Category Code
    tlv('53', '986') + // Transaction Currency (BRL)
    (amount && amount > 0 ? tlv('54', amount.toFixed(2)) : '') + // Transaction Amount
    tlv('58', 'BR') + // Country Code
    tlv('59', sanitize(beneficiaryName, 25)) + // Merchant Name
    tlv('60', sanitize(city, 15)) + // Merchant City
    tlv('62', additionalData); // Additional Data Field

  payload += '6304'; // CRC placeholder (ID + length fixo)
  const checksum = crc16(payload);
  return payload + checksum;
}
