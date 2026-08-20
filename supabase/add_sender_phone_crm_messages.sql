-- ============================================================
-- Adiciona sender_phone em crm_messages — telefone de quem MANDOU a mensagem
-- dentro de um GRUPO do WhatsApp (o "participant" da Evolution API).
--
-- Contexto: em crm_messages, a coluna "phone" de uma mensagem de grupo é o
-- ID do GRUPO (não de quem falou) — é assim que o chat do grupo inteiro fica
-- agrupado numa conversa só. Mas pra "clicar em cima de um participante e
-- abrir a conversa individual dele no CRM" (tela de Grupos do WhatsApp),
-- precisamos saber o telefone de cada remetente dentro do grupo — daí essa
-- coluna nova.
--
-- Rode esse script no SQL Editor do Supabase.
-- ============================================================

alter table crm_messages add column if not exists sender_phone text;

create index if not exists idx_crm_messages_sender_phone on crm_messages(sender_phone);

NOTIFY pgrst, 'reload schema';
