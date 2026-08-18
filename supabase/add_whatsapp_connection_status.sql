-- Rode esse SQL no Supabase — guarda o status da conexao do WhatsApp (Evolution API),
-- atualizado pelo webhook (api/whatsapp-webhook.js) e lido pela tela de Integrações
alter table robozinho_config add column if not exists whatsapp_connection_status text default 'close';

NOTIFY pgrst, 'reload schema';
