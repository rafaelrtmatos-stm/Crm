-- Criação da tabela de Despesas Fixas da Rafa Arts Graphics
create table if not exists despesas_fixas (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  nome text not null,
  categoria text not null default 'instalacoes', -- instalacoes, utilidades, servicos, software, outros
  valor numeric(12,2) not null default 0,
  dia_vencimento integer not null default 10,
  pago_este_mes boolean not null default false,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice de busca rápida por empresa
create index if not exists idx_despesas_fixas_company on despesas_fixas(company_id);

-- Permissões de Leitura e Gravação (RLS)
alter table despesas_fixas enable row level security;
create policy "allow all despesas_fixas" on despesas_fixas for all using (true) with check (true);

-- Habilita sincronização em Tempo Real (Realtime) entre todos os computadores e celulares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'despesas_fixas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE despesas_fixas;
  END IF;
END $$;

-- Recarrega o cache de schema da API
NOTIFY pgrst, 'reload schema';
