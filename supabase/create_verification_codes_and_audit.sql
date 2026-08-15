-- Rode esse script no SQL Editor do Supabase
-- Cria a infraestrutura de Assinatura Digital com Token (OTP) de envio manual:
-- 1) tabela de codigos de verificacao vinculada a contratos
-- 2) colunas de auditoria (IP, hash SHA-256, data/hora, dados do signatario) em contratos
-- Compativel com o schema existente (create_contratos_table.sql, add_contratos_multa_juros.sql etc)

-- =========================================================
-- 1) TABELA DE CODIGOS DE VERIFICACAO (OTP)
-- =========================================================
create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contratos(id) on delete cascade,
  code_hash text not null,            -- SHA-256 do codigo de 6 digitos (nunca guardamos o codigo em texto puro)
  expires_at timestamptz not null,    -- validade do codigo (padrao: 30 min apos gerado, ver otpUtils.ts)
  is_used boolean not null default false,
  used_at timestamptz,
  ip_address text,                    -- IP de quem GEROU o codigo (o operador, no painel Admin)
  attempts integer not null default 0, -- tentativas erradas de validacao feitas pelo cliente (protecao contra brute-force)
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_codes_contract on verification_codes(contract_id);
create index if not exists idx_verification_codes_expires on verification_codes(expires_at);
-- Acelera a busca do "codigo valido mais recente" feita na validacao (contract_id + is_used=false)
create index if not exists idx_verification_codes_contract_active on verification_codes(contract_id, is_used, expires_at desc);

alter table verification_codes enable row level security;
drop policy if exists "allow all verification_codes" on verification_codes;
-- Mesmo padrao permissivo ja usado nas outras tabelas do projeto (contratos, orcamentos, vendas):
-- protecao real fica a cargo da logica de expiracao/uso unico/tentativas, nao de RLS por usuario,
-- ja que o cliente final acessa a tela publica sem login.
create policy "allow all verification_codes" on verification_codes for all using (true) with check (true);

-- =========================================================
-- 2) COLUNAS DE AUDITORIA DA ASSINATURA EM CONTRATOS
-- =========================================================
alter table contratos add column if not exists rg text;
alter table contratos add column if not exists signed_at timestamptz;
alter table contratos add column if not exists signer_ip text;
alter table contratos add column if not exists signer_user_agent text;
alter table contratos add column if not exists document_hash text;     -- SHA-256 do texto_contrato NO MOMENTO da assinatura
alter table contratos add column if not exists signature_method text;  -- ex: 'otp_manual_whatsapp'

-- =========================================================
-- 3) NOVO STATUS "assinado"
-- =========================================================
-- A coluna contratos.status e' texto livre (sem CHECK constraint), entao nenhum ALTER e'
-- necessario para aceitar o novo valor 'assinado' -- e' so o app passar a usa-lo.
-- Nao reaproveitamos 'aceito' porque ele ja e' usado no fluxo manual de mudanca de status
-- (Admin marcando "aceito" na mao); 'assinado' fica reservado para assinatura via OTP validado,
-- permitindo diferenciar no relatorio quem assinou digitalmente de quem so foi marcado manualmente.

NOTIFY pgrst, 'reload schema';
