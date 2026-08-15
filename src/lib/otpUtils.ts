// Geracao e validacao do Token (OTP) de Assinatura Digital com envio manual.
// Fluxo: Admin gera o codigo (fica visivel so no painel) -> operador copia e manda por
// WhatsApp/E-mail -> cliente digita na tela publica -> validamos contra o Supabase.

import { supabase } from '../supabase';

const CODE_TTL_MINUTES = 30; // valor padrao, usado quando o operador nao escolhe um tempo customizado
const MAX_ATTEMPTS = 5;

/** Gera um codigo numerico de 6 digitos (ex: "482913"). */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** SHA-256 em hex de qualquer texto (reaproveitavel para OTP e para hash do documento). */
export async function sha256Hex(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface GeneratedOtp {
  code: string;         // codigo em texto puro -- SO existe aqui, na memoria do navegador do operador.
                         // Nunca e' salvo em texto puro no banco, so o hash.
  expiresAt: string;
  contractId: string;
}

/**
 * Gera um novo OTP para um contrato, salva o HASH dele no Supabase e retorna o codigo em texto
 * puro para o operador copiar e enviar manualmente (WhatsApp/E-mail). Invalida codigos anteriores
 * ainda ativos desse contrato, pra nunca ter 2 codigos validos ao mesmo tempo.
 *
 * @param ttlMinutes Quantos minutos o codigo fica valido. Opcional -- se nao for informado, usa o
 *                    padrao de 30 minutos (CODE_TTL_MINUTES). O operador pode escolher esse valor
 *                    por contrato/cliente na tela (ver ContractSignatureOtpPanel.tsx).
 */
export async function createVerificationCode(
  contractId: string,
  operatorIp?: string,
  ttlMinutes: number = CODE_TTL_MINUTES
): Promise<GeneratedOtp> {
  // Invalida qualquer codigo anterior ainda nao usado desse contrato
  await supabase
    .from('verification_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('contract_id', contractId)
    .eq('is_used', false);

  const code = generateOtpCode();
  const codeHash = await sha256Hex(code);
  const safeTtl = ttlMinutes > 0 ? ttlMinutes : CODE_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + safeTtl * 60 * 1000).toISOString();

  const { error } = await supabase.from('verification_codes').insert({
    contract_id: contractId,
    code_hash: codeHash,
    expires_at: expiresAt,
    ip_address: operatorIp || null,
  });

  if (error) throw error;

  return { code, expiresAt, contractId };
}

export type OtpValidationResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_used' | 'wrong_code' | 'too_many_attempts' };

/**
 * Valida o codigo digitado pelo cliente na tela publica. Busca o codigo ativo mais recente do
 * contrato, compara o hash, controla tentativas e marca como usado quando correto.
 * Nao atualiza o status do contrato aqui -- isso e' feito por signContract(), depois da validacao.
 */
export async function validateVerificationCode(contractId: string, inputCode: string): Promise<OtpValidationResult> {
  const { data: pending } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('contract_id', contractId)
    .eq('is_used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return { ok: false, reason: 'not_found' };

  if (pending.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const inputHash = await sha256Hex(inputCode);
  if (inputHash !== pending.code_hash) {
    await supabase
      .from('verification_codes')
      .update({ attempts: (pending.attempts || 0) + 1 })
      .eq('id', pending.id);
    return { ok: false, reason: 'wrong_code' };
  }

  await supabase
    .from('verification_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', pending.id);

  return { ok: true };
}

export interface SignContractParams {
  contractId: string;
  documentText: string;   // texto_contrato exibido/aceito no momento da assinatura
  clientIp: string;
  clientUserAgent: string;
}

/**
 * Checagem extra de identidade (antes de liberar o codigo OTP): compara os 4 ultimos digitos
 * do CPF/CNPJ digitados pelo cliente contra o que esta salvo no contrato. A comparacao acontece
 * dentro do banco (funcao check_contrato_document_last_digits) -- o documento completo nunca
 * chega no navegador do cliente, so o resultado true/false.
 */
export async function checkDocumentLastDigits(contractId: string, last4Digits: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_contrato_document_last_digits', {
    p_contract_id: contractId,
    p_last_digits: last4Digits,
  });
  if (error) throw error;
  return data === true;
}

export interface SignContractResult {
  documentHash: string;
  signedAt: string;
}

/**
 * Registra a assinatura em si: calcula o hash SHA-256 do texto do contrato no momento da
 * assinatura, grava IP/user-agent/timestamp e muda o status para 'assinado'. So deve ser chamada
 * DEPOIS de validateVerificationCode({ ok: true }).
 */
export async function signContract(params: SignContractParams): Promise<SignContractResult> {
  const documentHash = await sha256Hex(params.documentText);
  const signedAt = new Date().toISOString();

  const { error } = await supabase
    .from('contratos')
    .update({
      status: 'assinado',
      signed_at: signedAt,
      signer_ip: params.clientIp,
      signer_user_agent: params.clientUserAgent,
      document_hash: documentHash,
      signature_method: 'otp_manual_whatsapp',
      updated_at: signedAt,
    })
    .eq('id', params.contractId);

  if (error) throw error;

  return { documentHash, signedAt };
}
