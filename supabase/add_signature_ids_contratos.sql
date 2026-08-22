-- Rode esse script no SQL Editor do Supabase
-- Objetivo: dar a cada uma das DUAS assinaturas do contrato (CONTRATANTE e CONTRATADA) um
-- identificador proprio e individual, pra cada uma ter seu proprio carimbo digital no PDF
-- (ver drawDigitalSignatureStamp em src/lib/contratoPdf.ts). Ate' aqui so existia o hash do
-- documento (compartilhado pelas duas partes, prova de integridade) -- esses IDs sao um dado
-- NOVO, exclusivo de cada assinatura, usado no carimbo visual e no QR Code de validacao.
--
-- Compativel com o schema existente (create_verification_codes_and_audit.sql,
-- add_assinatura_empresa_contratos.sql).

alter table contratos add column if not exists contratante_signature_id text; -- ID exclusivo da assinatura do CONTRATANTE (cliente)
alter table contratos add column if not exists contratado_signature_id text; -- ID exclusivo da assinatura do CONTRATADO(A) (empresa)

-- Gerados no momento de CADA assinatura (ver generateSignatureId em src/lib/otpUtils.ts),
-- no formato "XXXX-XXXX-XXXX-XXXX" (hex maiusculo) -- nunca reaproveitados entre as duas partes
-- e nunca reaproveitados entre contratos diferentes.

NOTIFY pgrst, 'reload schema';
