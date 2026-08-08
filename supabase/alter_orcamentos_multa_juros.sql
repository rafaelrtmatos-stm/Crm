-- Rode esse script no SQL Editor do Supabase
-- Estrutura Multa e Juros por Atraso com campos reais (nao so texto solto)
alter table orcamentos add column if not exists multa_percentual numeric(5,2) default 2;
alter table orcamentos add column if not exists juros_modo text default 'mensal';
alter table orcamentos add column if not exists juros_percentual numeric(5,2) default 1;
alter table orcamentos add column if not exists dias_tolerancia integer default 0;
