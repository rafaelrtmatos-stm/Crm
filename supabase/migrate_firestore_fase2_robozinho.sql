-- ============================================================
-- MIGRACAO FIRESTORE -> SUPABASE — FASE 2 (Robozinho Rafa)
-- Rode esse script no SQL Editor do Supabase, DEPOIS da Fase 1
-- ============================================================

create table if not exists robozinho_config (
  company_id text primary key,
  is_active boolean not null default true,
  agent_name text not null default 'Robozinho Rafa',
  tone text not null default 'amigavel',
  auto_generate_suggestions boolean not null default true,
  use_knowledge_base boolean not null default true,
  show_floating_widget boolean not null default true,
  whatsapp_qr_integration jsonb default '{"enabled": false, "status": "not_configured"}',
  updated_at timestamptz not null default now()
);

create table if not exists robozinho_interactions (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  lead_id uuid references leads(id) on delete cascade,
  phone text,
  client_name text,
  channel text,
  client_message_text text,
  client_message_at timestamptz,
  suggested_text text,
  suggested_at timestamptz not null default now(),
  status text not null default 'pending', -- pending | used | edited | ignored | answered_manually | stale
  final_text text,
  final_sent_at timestamptz,
  action_by_name text,
  presented_options text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_robozinho_interactions_company on robozinho_interactions(company_id);
create index if not exists idx_robozinho_interactions_lead on robozinho_interactions(lead_id);

alter table robozinho_config enable row level security;
alter table robozinho_interactions enable row level security;
create policy "allow all robozinho_config" on robozinho_config for all using (true) with check (true);
create policy "allow all robozinho_interactions" on robozinho_interactions for all using (true) with check (true);

alter publication supabase_realtime add table robozinho_interactions;

NOTIFY pgrst, 'reload schema';
