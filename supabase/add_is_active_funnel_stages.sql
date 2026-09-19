-- Ativar/desativar etapas do funil CRM
alter table funnel_stages add column if not exists is_active boolean not null default true;
