-- Rode esse script no SQL Editor do Supabase
-- Campo de observacao livre por venda/pedido
alter table vendas add column if not exists observacoes text;
