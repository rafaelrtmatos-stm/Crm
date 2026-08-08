-- Rode esse script no SQL Editor do Supabase (formas de pagamento habilitadas, controlado pelo admin)
alter table configuracoes add column if not exists enabled_payment_methods jsonb default '["pix","dinheiro","cartao_credito","cartao_debito"]'::jsonb;
