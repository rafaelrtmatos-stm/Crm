-- ============================================================
-- MIGRACAO FIRESTORE -> SUPABASE — FASE 1 (fundacao)
-- Funis, Etapas do Funil, Leads e Mensagens (o nucleo do Funil CRM + Chat)
-- Rode esse script no SQL Editor do Supabase
-- ============================================================

-- FUNIS
create table if not exists funnels (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  name text not null,
  description text,
  color text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  "order" integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ETAPAS DO FUNIL
create table if not exists funnel_stages (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references funnels(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  color text,
  is_initial boolean default false,
  is_final boolean default false,
  is_lost boolean default false,
  sla_minutes integer,
  automations jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- LEADS (contatos do Funil CRM)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  full_name text not null,
  whatsapp_name text,
  contact_name text,
  first_name text,
  last_name text,
  phone text not null,
  email text,
  cpf_cnpj text,
  city text,
  state text,
  priority text,
  responsible_user_id text,
  funnel_id uuid references funnels(id) on delete set null,
  funnel_stage_id uuid references funnel_stages(id) on delete set null,
  source_type text,
  last_message_text text,
  last_message_direction text,
  waiting_since timestamptz,
  estimated_value numeric(12,2),
  tags text[],
  tracking jsonb,
  status text,
  auto_transcribe boolean default true,
  muted boolean default false,
  unread boolean default false,
  archived boolean default false,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MENSAGENS (chat) — chave principal de correlacao e o telefone (phone), igual ao Firestore hoje
create table if not exists crm_messages (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  lead_id uuid references leads(id) on delete set null,
  phone text not null,
  text text,
  direction text not null, -- incoming | outgoing | note
  is_note boolean default false,
  sender_name text,
  channel text default 'WhatsApp',
  media_url text,
  transcription jsonb,
  versions jsonb,
  current_version_index integer,
  last_edited_at timestamptz,
  last_edited_by text,
  created_at timestamptz not null default now()
);

-- GRUPOS DE LEADS (selecionar vários e agrupar, usado no popup de Mensagens)
create table if not exists lead_groups (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  name text not null,
  lead_ids uuid[] not null default '{}',
  created_by text,
  created_at timestamptz not null default now()
);
alter table lead_groups enable row level security;
create policy "allow all lead_groups" on lead_groups for all using (true) with check (true);

-- Indices uteis pra essas consultas serem rapidas
create index if not exists idx_leads_company on leads(company_id);
create index if not exists idx_leads_funnel on leads(funnel_id);
create index if not exists idx_leads_stage on leads(funnel_stage_id);
create index if not exists idx_leads_phone on leads(phone);
create index if not exists idx_funnel_stages_funnel on funnel_stages(funnel_id);
create index if not exists idx_crm_messages_phone on crm_messages(company_id, phone, created_at);
create index if not exists idx_crm_messages_lead on crm_messages(lead_id);

-- RLS (mesmo padrao "liberado" ja usado no resto do sistema)
alter table funnels enable row level security;
alter table funnel_stages enable row level security;
alter table leads enable row level security;
alter table crm_messages enable row level security;

create policy "allow all funnels" on funnels for all using (true) with check (true);
create policy "allow all funnel_stages" on funnel_stages for all using (true) with check (true);
create policy "allow all leads" on leads for all using (true) with check (true);
create policy "allow all crm_messages" on crm_messages for all using (true) with check (true);

-- REALTIME: habilita atualizacao ao vivo (equivalente ao onSnapshot do Firestore) pras 3 tabelas
-- que precisam refletir na tela na hora (chat, kanban arrastando card, lead novo chegando)
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table crm_messages;
alter publication supabase_realtime add table funnel_stages;

NOTIFY pgrst, 'reload schema';
