-- Rode esse script no SQL Editor do Supabase
-- Adiciona ao orçamento: prazo de pagamento (separado do prazo de produção), condição de entrega,
-- multa/juros por atraso, garantia do serviço e política de cancelamento.

alter table orcamentos add column if not exists prazo_pagamento_texto text;
alter table orcamentos add column if not exists condicao_entrega_texto text;
alter table orcamentos add column if not exists multa_juros_texto text;
alter table orcamentos add column if not exists garantia_texto text;
alter table orcamentos add column if not exists politica_cancelamento_texto text;
