-- Rode esse script no SQL Editor do Supabase (multiplas formas de pagamento por venda)
alter table vendas add column if not exists payments jsonb default '[]'::jsonb;
alter table vendas add column if not exists pending_payment_method text;
