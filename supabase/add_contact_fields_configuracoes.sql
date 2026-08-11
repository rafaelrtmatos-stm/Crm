-- Rode esse script no SQL Editor do Supabase
-- Campos de contato/identidade editaveis (aparecem no rodape do Recibo e do Orcamento)
alter table configuracoes add column if not exists contact_whatsapp text;
alter table configuracoes add column if not exists contact_instagram text;
alter table configuracoes add column if not exists contact_facebook text;
alter table configuracoes add column if not exists contact_email text;
alter table configuracoes add column if not exists contact_site text;
alter table configuracoes add column if not exists contact_endereco text;
NOTIFY pgrst, 'reload schema';
