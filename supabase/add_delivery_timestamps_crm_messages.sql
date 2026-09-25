-- Guarda QUANDO cada tique aconteceu (não só o status atual) -- pra mostrar "Entregue às 14:32,
-- lida às 14:35" quando o atendente toca nos tiques da mensagem, igual ao WhatsApp original.
-- Preenchido pelo webhook (api/whatsapp-webhook.js, evento MESSAGES_UPDATE), sempre SÓ NA
-- PRIMEIRA vez que cada status é alcançado (nunca sobrescreve um horário já gravado).
alter table crm_messages add column if not exists delivered_at timestamptz;
alter table crm_messages add column if not exists read_at timestamptz;

NOTIFY pgrst, 'reload schema';
