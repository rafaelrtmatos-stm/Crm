// Identidade oficial da CONTRATADA (Rafa Arts Graphics), usada como fonte unica de verdade
// no texto do contrato, no carimbo de auditoria do PDF e no painel "Ver Detalhes do Aceite".
// Evita que Razao Social / Nome Fantasia / CNPJ fiquem divergentes entre esses 3 lugares.
export const OFFICIAL_COMPANY = {
  razaoSocial: 'Rafael Tavares Matos 02580326260',
  nomeFantasia: 'Rafa Arts Graphics',
  cnpj: '28.884.125/0001-40',
};

// Dominio publico onde o CRM esta hospedado (Vercel) -- mesmo valor usado no link de
// assinatura enviado ao cliente e na "Origem" impressa no carimbo de auditoria do contrato.
export const PUBLIC_SIGN_BASE_URL = 'https://pro.rafaartsgraphics.com.br';
export const PUBLIC_SIGN_ORIGIN = 'pro.rafaartsgraphics.com.br';

/**
 * Monta o link publico e EXCLUSIVO de assinatura de um contrato especifico (um por contrato,
 * pelo id). Usado tanto pra enviar ao cliente (painel OTP) quanto pra exibir no carimbo de
 * auditoria (painel Admin e rodape do PDF) -- sempre o mesmo link, pego automaticamente a
 * partir do id do contrato, sem precisar digitar/colar na mao em cada lugar.
 */
export function getContractSignatureLink(contratoId: string): string {
  return `${PUBLIC_SIGN_BASE_URL}/assinar/${contratoId}`;
}

/**
 * Monta o link publico da PAGINA DE VALIDACAO (/validar) para uma assinatura especifica, usado
 * no QR Code do carimbo digital e no manifesto de assinatura. Diferente do link acima
 * (/assinar/:id, que abre o contrato em si), essa pagina e' publica e independente do contrato:
 * qualquer pessoa pode conferir a autenticidade da assinatura digitando o codigo ou enviando o
 * PDF, sem precisar do link exclusivo enviado ao cliente.
 */
export function getSignatureValidationLink(signatureId: string): string {
  return `${PUBLIC_SIGN_BASE_URL}/validar?sig=${encodeURIComponent(signatureId)}`;
}
