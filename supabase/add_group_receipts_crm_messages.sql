-- Rode esse SQL no Supabase — guarda quem recebeu/viu cada mensagem enviada em GRUPO
-- Formato: [{ "jid": "...", "phone": "5593...", "deliveredAt": "...", "readAt": "..." }]
alter table crm_messages add column if not exists receipts jsonb default '[]'::jsonb;
