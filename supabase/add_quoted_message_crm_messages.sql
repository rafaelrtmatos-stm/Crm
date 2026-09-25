-- Migração: Adiciona colunas para suportar citações / mensagens respondidas no WhatsApp
-- Armazena o ID da mensagem original marcada, o texto resumido da citação e o remetente original.

alter table crm_messages add column if not exists quoted_message_id text;
alter table crm_messages add column if not exists quoted_text text;
alter table crm_messages add column if not exists quoted_sender text;

NOTIFY pgrst, 'reload schema';
