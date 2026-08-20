-- Rode esse SQL no Supabase — guarda a URL da foto de perfil do contato no WhatsApp
alter table leads add column if not exists photo_url text;

NOTIFY pgrst, 'reload schema';
