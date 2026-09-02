-- Tabela para cadastro de Matérias-Primas do Financeiro
create table if not exists materias_primas (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  name text not null,
  unit text not null default 'un', -- un, m, m2, kg, g, l, ml, rolo, pacote, cm, mm
  cost_price numeric(12,4) not null default 0,
  largura_material numeric(8,3),
  comprimento_bobina numeric(8,2),
  valor_bobina numeric(12,2),
  quantidade_estoque numeric(10,2),
  custo_por_m2 numeric(12,4),
  tipo_calculo_custo text default 'bobina',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adiciona colunas caso a tabela já existisse antes
alter table materias_primas
  add column if not exists largura_material numeric(8,3),
  add column if not exists comprimento_bobina numeric(8,2),
  add column if not exists valor_bobina numeric(12,2),
  add column if not exists quantidade_estoque numeric(10,2),
  add column if not exists custo_por_m2 numeric(12,4),
  add column if not exists tipo_calculo_custo text default 'bobina';

create index if not exists idx_materias_primas_company on materias_primas(company_id);

alter table materias_primas enable row level security;
create policy "allow all materias_primas" on materias_primas for all using (true) with check (true);

-- Habilita o Realtime do Supabase para a tabela materias_primas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'materias_primas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE materias_primas;
  END IF;
END $$;

-- Coluna para composição de matérias-primas no cadastro de produtos
alter table produtos add column if not exists materias_primas jsonb default '[]'::jsonb;
alter table vendas add column if not exists consumo_materias_primas jsonb default '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
