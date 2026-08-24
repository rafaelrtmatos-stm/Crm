-- Rode esse script no SQL Editor do Supabase
-- Objetivo: gravar, junto com o IP do cliente (contratos.signer_ip), a localizacao aproximada
-- (cidade/regiao/pais) inferida a partir desse IP no momento da assinatura -- parte da trilha de
-- auditoria (Audit Trail) exigida para validade juridica da assinatura eletronica (MP 2.200-2/2001,
-- Lei 14.063/2020). Nenhum dado de GPS e coletado, so a geolocalizacao por IP publico (ver
-- getIpLocation em src/lib/contractUtils.ts).
--
-- Compativel com o schema existente (create_verification_codes_and_audit.sql).

alter table contratos add column if not exists signer_location text;

NOTIFY pgrst, 'reload schema';
