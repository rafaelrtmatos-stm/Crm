-- ESPELHO do que ESTA em producao (projeto Supabase "CRMRafa"): documentacao / recriar o banco em outro ambiente.
-- FORMATO ENXUTO (migration de 23/09): UMA LINHA POR CONVERSA (UNIQUE company_id + phone), com waiting_since.
-- NAO existe coluna message_id (era o formato antigo, 1 linha por mensagem). Consultar por message_id => HTTP 400.
--   * Status: 'pending' | 'resolved'. Abrir a conversa NAO mexe aqui; so "Marcar como resolvido" faz UPDATE.
--   * Mensagem nova depois de resolvida reabre a mesma linha como 'pending' (waiting_since reinicia).
--   * Mensagem nova com a conversa ja pendente so atualiza previa/horario (waiting_since NAO reinicia).
--   * O gatilho (funcao completa em supabase/fix_crm_notify_trigger_por_conversa.sql) nunca bloqueia a mensagem.

create table if not exists crm_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  lead_id uuid references leads(id) on delete set null,
  phone text not null,
  group_id uuid references whatsapp_groups(id) on delete set null,
  is_group boolean not null default false,
  title text,
  sender_name text,
  photo_url text,
  preview text,
  message_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  waiting_since timestamptz not null,
  constraint crm_notifications_company_phone_key unique (company_id, phone)
);

create index if not exists idx_crm_notifications_phone on crm_notifications(company_id, phone, status);
create index if not exists idx_crm_notifications_status on crm_notifications(company_id, status, message_at desc);

alter table crm_notifications enable row level security;
drop policy if exists "allow all crm_notifications" on crm_notifications;
create policy "allow all crm_notifications" on crm_notifications for all using (true) with check (true);

-- Funcao do gatilho: ver supabase/fix_crm_notify_trigger_por_conversa.sql (versao correta para este formato).
-- RPC de leitura por permissao de grupo: public.crm_notifications_visible(p_user_id, p_status) (migration 23/09).

NOTIFY pgrst, 'reload schema';
