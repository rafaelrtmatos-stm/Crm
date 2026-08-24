-- Rode esse script no SQL Editor do Supabase
-- Fecha 3 lacunas da trilha de auditoria (Audit Trail) da assinatura eletronica:
--
-- 1) TIMESTAMP OFICIAL VIA SERVIDOR (NTP): ate' aqui, signed_at/empresa_signed_at eram gerados
--    com `new Date()` do NAVEGADOR do cliente/operador (hora local do dispositivo, que pode
--    estar errada ou manipulada). Passa a usar o horario do proprio servidor Postgres (`now()`),
--    que roda sincronizado por NTP -- ver get_server_now() abaixo, chamada logo antes de gravar
--    cada assinatura (src/lib/otpUtils.ts).
--
-- 2) USER-AGENT DA EMPRESA: ja gravavamos IP/localizacao/user-agent do lado do CLIENTE
--    (signer_ip, signer_location, signer_user_agent), mas nao o navegador/dispositivo usado pelo
--    OPERADOR ao confirmar a assinatura da CONTRATADA. Nova coluna empresa_user_agent.
--
-- 3) HASH DO PDF FINAL: document_hash e' o SHA-256 do TEXTO do contrato (prova de integridade do
--    conteudo). Para permitir uma pagina publica de validacao (/validar) onde qualquer pessoa
--    pode enviar o ARQUIVO PDF e conferir se bate com o que foi efetivamente assinado, gravamos
--    tambem pdf_hash = SHA-256 dos BYTES do PDF final gerado (ver uploadContratoPdfAssinado em
--    src/lib/contratoPdfStorage.ts).

create or replace function get_server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

alter table contratos add column if not exists empresa_user_agent text;
alter table contratos add column if not exists pdf_hash text;

NOTIFY pgrst, 'reload schema';
