-- Transcrição automática de áudios do WhatsApp.
-- Reaproveita colunas existentes: content_type = tipo da mensagem ('audio'), media_url = arquivo,
-- transcription (jsonb: { text, isAutomatic, isVisible }) = texto transcrito, whatsapp_message_id = anti-duplicação.
-- Só acrescenta o que faltava. Não altera dados existentes.
alter table crm_messages
  add column if not exists media_mime_type text,
  add column if not exists media_duration integer,
  add column if not exists transcription_status text,
  add column if not exists transcription_error text,
  add column if not exists transcription_created_at timestamptz,
  add column if not exists transcription_attempts integer not null default 0,
  add column if not exists transcription_started_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_messages_transcription_status_check') then
    alter table crm_messages
      add constraint crm_messages_transcription_status_check
      check (transcription_status is null or transcription_status in ('pending', 'processing', 'completed', 'failed'));
  end if;
end $$;

create index if not exists idx_crm_messages_transcription_pending
  on crm_messages (transcription_status)
  where transcription_status in ('pending', 'processing');
