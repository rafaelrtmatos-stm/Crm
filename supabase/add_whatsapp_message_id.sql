-- Rode esse SQL no Supabase — guarda o ID original da mensagem no WhatsApp, usado
-- pra evitar importar a mesma mensagem duas vezes (idempotencia na importacao de historico)
alter table crm_messages add column if not exists whatsapp_message_id text;
create unique index if not exists idx_crm_messages_whatsapp_id on crm_messages(company_id, whatsapp_message_id) where whatsapp_message_id is not null;

NOTIFY pgrst, 'reload schema';
