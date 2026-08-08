-- Rode esse script no SQL Editor do Supabase
-- Estrutura o Prazo de Producao/Entrega em campos de verdade (dias, tipo, gatilho, data prevista)
alter table orcamentos add column if not exists prazo_dias integer;
alter table orcamentos add column if not exists prazo_tipo text default 'uteis';
alter table orcamentos add column if not exists prazo_gatilho text default 'aprovacao';
alter table orcamentos add column if not exists prazo_data_prevista date;
