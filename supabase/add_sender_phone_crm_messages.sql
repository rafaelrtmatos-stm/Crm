-- Rode esse SQL no Supabase — guarda o telefone de quem enviou cada mensagem em GRUPO (pra mostrar foto e nome)
alter table crm_messages add column if not exists sender_phone text;
NOTIFY pgrst, 'reload schema';
