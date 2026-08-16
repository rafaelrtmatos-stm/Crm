-- Rode esse script no SQL Editor do Supabase
-- Objetivo: separar a assinatura do CLIENTE da assinatura da EMPRESA, que ate' aqui era
-- gravada automaticamente no mesmo instante em que o cliente assinava (ver signContract em
-- src/lib/otpUtils.ts). Agora a assinatura da empresa passa a ser um passo manual e explicito:
-- o cliente assina -> contrato fica 'aguardando_assinatura_empresa' -> o operador confirma a
-- propria assinatura (com a senha de login dele) no painel -> so ai o contrato vira 'assinado'
-- de verdade (as duas partes) e o PDF final e' gerado/salvo.
--
-- Compativel com o schema existente (create_contratos_table.sql, create_verification_codes_and_audit.sql,
-- add_pdf_url_contratos.sql).

alter table contratos add column if not exists empresa_signed_at timestamptz;
alter table contratos add column if not exists empresa_signed_by text; -- nome de quem confirmou a assinatura da empresa (ver AppUser.name)

-- =========================================================
-- NOVO STATUS "aguardando_assinatura_empresa"
-- =========================================================
-- A coluna contratos.status e' texto livre (sem CHECK constraint), entao nenhum ALTER e'
-- necessario pra aceitar o novo valor -- e' so o app passar a usa-lo.
-- Fluxo de status a partir de agora:
--   ... -> aguardando_aceite -> [cliente assina no link] -> aguardando_assinatura_empresa
--       -> [operador confirma com senha] -> assinado -> em_execucao -> concluido -> encerrado
-- pdf_url continua sendo preenchido UMA UNICA VEZ, so que agora no momento da assinatura da
-- EMPRESA (nao mais na assinatura do cliente) -- e' so ai que o documento fica completo.

NOTIFY pgrst, 'reload schema';
