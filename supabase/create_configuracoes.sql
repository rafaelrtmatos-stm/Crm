-- Rode esse script no SQL Editor do Supabase (cria a tabela de configuracoes, ex: chave PIX)
create table if not exists configuracoes (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts' unique,
  pix_key text,
  pix_key_type text,
  beneficiary_name text,
  city text,
  updated_at timestamptz not null default now()
);

alter table configuracoes enable row level security;
create policy "allow all configuracoes" on configuracoes for all using (true) with check (true);
