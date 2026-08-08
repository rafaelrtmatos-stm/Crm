-- Rode esse script no SQL Editor do Supabase (adiciona as duas logos: clara e escura)
alter table configuracoes add column if not exists logo_light_url text;
alter table configuracoes add column if not exists logo_dark_url text;
