-- Rode esse script no SQL Editor do Supabase (adiciona status do caixa, sincronizado entre PCs)
alter table configuracoes add column if not exists caixa_aberto boolean not null default false;
alter table configuracoes add column if not exists caixa_aberto_em timestamptz;
