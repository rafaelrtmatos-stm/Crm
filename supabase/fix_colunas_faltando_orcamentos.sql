-- Rode esse script no SQL Editor do Supabase
-- Garante TODAS as colunas de orcamentos usadas pelo sistema (junta todos os SQLs anteriores de orcamentos em um so, seguro rodar de novo)
alter table orcamentos add column if not exists prazo_pagamento_texto text;
alter table orcamentos add column if not exists condicao_entrega_texto text;
alter table orcamentos add column if not exists multa_juros_texto text;
alter table orcamentos add column if not exists garantia_texto text;
alter table orcamentos add column if not exists politica_cancelamento_texto text;

alter table orcamentos add column if not exists prazo_dias integer;
alter table orcamentos add column if not exists prazo_tipo text default 'uteis';
alter table orcamentos add column if not exists prazo_gatilho text default 'aprovacao';
alter table orcamentos add column if not exists prazo_data_prevista date;

alter table orcamentos add column if not exists formas_pagamento jsonb default '[]'::jsonb;

alter table orcamentos add column if not exists politica_pagamento text default 'entrada_restante_entrega';
alter table orcamentos add column if not exists entrada_obrigatoria boolean default false;

alter table orcamentos add column if not exists pagamento_posterior_autorizado boolean default false;
alter table orcamentos add column if not exists pagamento_posterior_data date;
alter table orcamentos add column if not exists pagamento_posterior_dias integer;
alter table orcamentos add column if not exists pagamento_posterior_condicao text;
alter table orcamentos add column if not exists pagamento_posterior_responsavel text;

alter table orcamentos add column if not exists multa_percentual numeric(5,2) default 2;
alter table orcamentos add column if not exists juros_modo text default 'mensal';
alter table orcamentos add column if not exists juros_percentual numeric(5,2) default 1;
alter table orcamentos add column if not exists dias_tolerancia integer default 0;

-- Forca o Supabase a atualizar o "schema cache"
NOTIFY pgrst, 'reload schema';
