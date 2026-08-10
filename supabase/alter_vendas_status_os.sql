-- Rode esse script no SQL Editor do Supabase
-- Status detalhado da Ordem de Servico (7 etapas) + historico de mudancas (nunca apagado)
alter table vendas add column if not exists service_status text default 'pedido_recebido';
alter table vendas add column if not exists status_history jsonb default '[]'::jsonb;
alter table vendas add column if not exists responsavel text;
