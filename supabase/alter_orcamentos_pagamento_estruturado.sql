-- Rode esse script no SQL Editor do Supabase
-- Estrutura a Forma de Pagamento do orcamento (varias formas combinadas, parcelas, vencimentos)
alter table orcamentos add column if not exists formas_pagamento jsonb default '[]'::jsonb;
