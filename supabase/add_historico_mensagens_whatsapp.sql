-- ============================================================
-- IMPORTAÇÃO DE HISTÓRICO DE MENSAGENS (Evolution API -> crm_messages)
-- Rode esse script no SQL Editor do Supabase antes de usar o botão
-- "Importar histórico" em Integrações > WhatsApp.
-- ============================================================

-- wa_message_id: id original da mensagem na Evolution API (msg.key.id). Serve pra
-- não duplicar mensagem que já entrou pelo webhook em tempo real caso a importação
-- de histórico passe por cima do mesmo período depois.
alter table crm_messages add column if not exists wa_message_id text;

-- is_historical_import: marca mensagem que entrou pela importação em massa (e não
-- pelo webhook em tempo real). O front (App.tsx) usa essa flag pra NÃO disparar a
-- automação de criar/mover lead pra ENTRADA em cada uma das 45 mil mensagens antigas
-- — isso resetaria a etapa de todos os leads. Mensagem real (webhook) sempre vem
-- com is_historical_import = false (padrão).
alter table crm_messages add column if not exists is_historical_import boolean not null default false;

-- Evita duplicar a MESMA mensagem (unica por empresa+id da Evolution). Índice não-parcial
-- de propósito: no Postgres, valores NULL nunca colidem entre si num índice único — então
-- mensagens sem wa_message_id (notas internas, mensagens simuladas antigas) continuam
-- entrando à vontade, sem precisar de WHERE parcial (que complicaria o ON CONFLICT do
-- Supabase/PostgREST usado em api/whatsapp-import-messages.js).
create unique index if not exists idx_crm_messages_wa_message_id
  on crm_messages(company_id, wa_message_id);

-- FILA DE IMPORTAÇÃO — uma linha por conversa (telefone/grupo) da Evolution API.
-- status: pending (na fila) | importing (peguei mas não terminei, tem cursor) | done | error
create table if not exists whatsapp_import_progress (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  remote_jid text not null, -- ex: 5511999999999@s.whatsapp.net
  phone text not null,      -- só os dígitos, igual ao resto do sistema
  contact_name text,
  status text not null default 'pending',
  cursor_page integer not null default 0, -- próxima página a buscar na Evolution API
  messages_imported integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, remote_jid)
);

create index if not exists idx_wa_import_progress_status on whatsapp_import_progress(company_id, status);

alter table whatsapp_import_progress enable row level security;
create policy "allow all whatsapp_import_progress" on whatsapp_import_progress for all using (true) with check (true);

alter publication supabase_realtime add table whatsapp_import_progress;

NOTIFY pgrst, 'reload schema';
