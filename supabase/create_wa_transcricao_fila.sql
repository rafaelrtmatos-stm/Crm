-- FASE 4 (chat ao vivo): fila de transcrição de áudio em tabela PRÓPRIA, separada de
-- crm_messages. Pré-requisito pro passo 4 da Fase 3 (parar de gravar texto/mídia em
-- crm_messages) não quebrar a transcrição automática de áudio no meio do caminho --
-- antes o status/texto da transcrição vivia em colunas de crm_messages
-- (supabase/add_transcricao_audio_crm_messages.sql).
--
-- Rode esse SQL no SQL Editor do Supabase (idempotente).
create table if not exists public.wa_transcricao_fila (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  phone text not null,
  whatsapp_message_id text not null,
  media_url text,
  content_type text,
  transcription jsonb,
  transcription_status text not null default 'pending',
  transcription_error text,
  transcription_attempts integer not null default 0,
  transcription_started_at timestamptz,
  transcription_created_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wa_transcricao_fila_status_check') then
    alter table public.wa_transcricao_fila
      add constraint wa_transcricao_fila_status_check
      check (transcription_status in ('pending', 'processing', 'completed', 'failed'));
  end if;
end $$;

-- Mesmo (company_id, whatsapp_message_id) do crm_messages -- é o que casa uma linha da fila
-- com a mensagem de áudio que o front busca ao vivo na Evolution API. Evita duplicar a
-- mesma mensagem na fila se o webhook reprocessar o mesmo evento (retry).
create unique index if not exists idx_wa_transcricao_fila_msg_id
  on public.wa_transcricao_fila (company_id, whatsapp_message_id);

create index if not exists idx_wa_transcricao_fila_phone
  on public.wa_transcricao_fila (company_id, phone);

create index if not exists idx_wa_transcricao_fila_pending
  on public.wa_transcricao_fila (transcription_status)
  where transcription_status in ('pending', 'processing');

alter table public.wa_transcricao_fila enable row level security;
drop policy if exists "allow all wa_transcricao_fila" on public.wa_transcricao_fila;
create policy "allow all wa_transcricao_fila" on public.wa_transcricao_fila for all to public using (true) with check (true);

-- Realtime: o chat aberto escuta UPDATE nessa tabela pra saber quando uma transcrição
-- termina (ver src/components/Modules.tsx), mesmo padrão de supabase/fix_realtime_produtos.sql.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'wa_transcricao_fila'
  ) then
    alter publication supabase_realtime add table public.wa_transcricao_fila;
  end if;
end $$;

notify pgrst, 'reload schema';
