-- Rode esse script no SQL Editor do Supabase (adiciona colunas que faltavam na tabela vendas)
alter table vendas add column if not exists settled_at timestamptz;
alter table vendas add column if not exists settled_payment_method text;
