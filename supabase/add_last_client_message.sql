-- Rode esse SQL no Supabase.
-- A previa da lista de chats (MessagesSidebarPopup.tsx / Modules.tsx) usava
-- leads.last_message_text, que e' sobrescrito TANTO por mensagem recebida quanto
-- por mensagem enviada pelo atendente (ver Modules.tsx handleSendMessage) -- por
-- isso a previa as vezes mostrava a ultima mensagem que VOCE mandou, nao a do
-- cliente. Essas colunas novas so sao atualizadas quando a mensagem e' 'incoming'
-- (ver App.tsx processIncomingMessage), entao sempre refletem a ultima mensagem
-- real do cliente, independente de quantas mensagens o atendente mande depois.

alter table leads add column if not exists last_client_message_text text;
alter table leads add column if not exists last_client_message_at timestamptz;

NOTIFY pgrst, 'reload schema';
