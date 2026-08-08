-- Rode esse script no SQL Editor do Supabase (cadastro avancado de clientes)
alter table clientes add column if not exists limite_credito numeric(12,2) default 0;
alter table clientes add column if not exists patrimonios jsonb default '[]'::jsonb;
alter table clientes add column if not exists is_vip boolean default false;
