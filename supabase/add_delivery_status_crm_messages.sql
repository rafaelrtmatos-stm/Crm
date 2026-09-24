-- Rode esse SQL no Supabase — guarda o status de entrega/leitura das mensagens ENVIADAS
-- (os "tiques" do WhatsApp): sent = 1 tique cinza, delivered = 2 tiques cinza, read = 2 tiques azuis.
-- Quem preenche e' o webhook (api/whatsapp-webhook.js, evento MESSAGES_UPDATE da Evolution API).
alter table crm_messages add column if not exists delivery_status text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_messages_delivery_status_check') then
    alter table crm_messages
      add constraint crm_messages_delivery_status_check
      check (delivery_status is null or delivery_status in ('sent', 'delivered', 'read'));
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
