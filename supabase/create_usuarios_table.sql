-- Rode esse script no SQL Editor do Supabase
-- Cria a tabela de usuarios comuns (o admin master continua no Firebase, separado)
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text,
  role text default 'atendente',
  is_admin boolean default false,
  is_active boolean default true,
  allowed_tabs jsonb default '["dashboard","crm","messages","pos","contacts","production","settings"]'::jsonb,
  allowed_actions jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table usuarios enable row level security;
create policy "allow all usuarios" on usuarios for all using (true) with check (true);

-- Tempo real (pra permissoes atualizarem na hora se o admin editar enquanto o usuario esta logado)
DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'usuarios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE usuarios;
  END IF;
END $outer$;
