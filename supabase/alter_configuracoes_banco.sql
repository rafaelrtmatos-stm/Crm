-- Rode esse script no SQL Editor do Supabase (adiciona nome do banco na configuracao PIX)
alter table configuracoes add column if not exists pix_bank text;
