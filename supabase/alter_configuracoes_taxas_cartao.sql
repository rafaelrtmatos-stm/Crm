-- Rode esse script no SQL Editor do Supabase (taxas de parcelamento no cartao de credito)
alter table configuracoes add column if not exists credit_card_fees jsonb default '[{"installments":1,"feePercent":0}]'::jsonb;
