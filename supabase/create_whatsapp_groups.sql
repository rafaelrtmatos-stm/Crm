-- Rode esse SQL no Supabase — cria a estrutura de grupos do WhatsApp
-- Grupo novo entra invisivel (visivel = false) ate o admin liberar e escolher quem ve

create table if not exists whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references whatsapp_instances(id) on delete cascade,
  group_jid text not null,
  nome text,
  visivel boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instance_id, group_jid)
);

create table if not exists user_whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references usuarios(id) on delete cascade,
  group_id uuid not null references whatsapp_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, group_id)
);

create index if not exists idx_whatsapp_groups_instance on whatsapp_groups(instance_id);
create index if not exists idx_user_whatsapp_groups_user on user_whatsapp_groups(user_id);
create index if not exists idx_user_whatsapp_groups_group on user_whatsapp_groups(group_id);

NOTIFY pgrst, 'reload schema';
