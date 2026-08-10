-- Rode esse script no SQL Editor do Supabase
-- Garante que configuracoes tenha uma chave unica em company_id
-- (necessario pro "upsert" funcionar; sem isso o Supabase recusa salvar com erro
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification")
DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'configuracoes'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%company_id%'
  ) THEN
    ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_company_id_key UNIQUE (company_id);
  END IF;
END $outer$;

-- Garante as colunas usadas pela tela de PIX
alter table configuracoes add column if not exists pix_key text;
alter table configuracoes add column if not exists beneficiary_name text;
alter table configuracoes add column if not exists city text;
alter table configuracoes add column if not exists pix_bank text;

NOTIFY pgrst, 'reload schema';

-- Taxa configuravel do cartao de debito
alter table configuracoes add column if not exists debit_card_fee_percent numeric(5,2) default 0;
NOTIFY pgrst, 'reload schema';
