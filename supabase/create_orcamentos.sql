-- Rode esse script no SQL Editor do Supabase (modulo de Orcamentos)
create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  company_id text not null default 'rafa-arts',
  cliente_id uuid,
  customer_name text,
  cpf_cnpj text,
  phone text,
  address text,
  responsavel text,
  items jsonb default '[]'::jsonb,
  desconto numeric(12,2) default 0,
  total numeric(12,2) not null default 0,
  observacoes text,
  prazo_producao text,
  forma_pagamento_texto text,
  entrada_percentual numeric(5,2),
  entrada_valor numeric(12,2),
  validade date,
  status text not null default 'rascunho',
  venda_id uuid,
  aprovado_em timestamptz,
  aprovado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table orcamentos enable row level security;
create policy "allow all orcamentos" on orcamentos for all using (true) with check (true);

-- Vincula uma venda ao orcamento que a originou
alter table vendas add column if not exists orcamento_id uuid;
