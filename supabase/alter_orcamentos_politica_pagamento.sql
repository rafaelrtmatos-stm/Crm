-- Rode esse script no SQL Editor do Supabase
-- Politica de Pagamento estruturada (sem entrada, entrada fixa, percentual, obrigatoria, integral, etc)
alter table orcamentos add column if not exists politica_pagamento text default 'entrada_restante_entrega';
alter table orcamentos add column if not exists entrada_obrigatoria boolean default false;
