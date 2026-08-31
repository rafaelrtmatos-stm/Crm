-- Tabela para cadastro de Matérias-Primas do Financeiro
create table if not exists materias_primas (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  name text not null,
  unit text not null default 'un', -- un, m, m2, kg, g, l, ml, rolo, pacote, cm, mm
  cost_price numeric(12,4) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table materias_primas enable row level security;
create policy "allow all materias_primas" on materias_primas for all using (true) with check (true);

-- Coluna para composição de matérias-primas no cadastro de produtos
alter table produtos add column if not exists materias_primas jsonb default '[]'::jsonb;
alter table vendas add column if not exists consumo_materias_primas jsonb default '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
