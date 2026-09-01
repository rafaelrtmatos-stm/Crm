-- Tabela para cadastro de Máquinas (usada em MaquinasModule / maquinasStorage.ts)
-- Sem essa tabela, o Supabase retorna 404 ("Could not find the table 'public.maquinas'
-- in the schema cache") e cada PC cai no fallback de localStorage, ficando com uma
-- lista isolada e fora de sincronia com os demais.

create table if not exists maquinas (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  nome text not null,
  ativa boolean not null default true,
  tipo text not null default 'impressao',
  valor_maquina numeric(12,2) not null default 0,
  vida_util_anos numeric(6,2) not null default 5,
  horas_uso_mes numeric(8,2) not null default 100,
  manutencao_anual numeric(12,2) not null default 0,
  potencia_kw numeric(8,2) not null default 0,
  velocidade_producao_m2h numeric(8,2) not null default 10,
  tinta_quantidade_ml numeric(10,2) not null default 0,
  tinta_valor numeric(10,2) not null default 0,
  tinta_consumo_ml_m2 numeric(10,2) not null default 0,
  cabeca_valor numeric(12,2) not null default 0,
  cabeca_vida_util_horas numeric(10,2) not null default 0,
  tarifa_kwh numeric(6,3) not null default 0.98,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maquinas_company_id on maquinas(company_id);

alter table maquinas enable row level security;
create policy "allow all maquinas" on maquinas for all using (true) with check (true);

-- Habilita realtime (necessário para subscribeToMaquinas em maquinasStorage.ts
-- sincronizar automaticamente entre PCs sem precisar recarregar a página)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'maquinas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE maquinas;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
