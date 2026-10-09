-- Rode esse SQL no Supabase — permite SILENCIAR um grupo do WhatsApp (botão de sino no cabeçalho da conversa).
-- Grupo silenciado continua recebendo mensagens e somando o número de não lidas, mas NÃO toca som,
-- NÃO mostra aviso na tela e NÃO gera notificação do navegador. O silêncio vale pra todos os usuários.

alter table whatsapp_groups add column if not exists silenciado boolean not null default false;
