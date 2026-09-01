-- Cria a tabela `maquinas` (módulo Máquinas e Equipamentos).
-- A tabela nunca existia no banco -- por isso o app caía sempre no fallback
-- de localStorage, e cada PC/navegador acabava com sua própria lista
-- (dados nunca chegavam a ser compartilhados entre dispositivos).
-- Rode esse script no Supabase: SQL Editor -> New Query -> cole tudo -> Run

create extension if not exists "pgcrypto";

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
  tinta_valor numeric(12,2) not null default 0,
  tinta_consumo_ml_m2 numeric(10,2) not null default 0,
  cabeca_valor numeric(12,2) not null default 0,
  cabeca_vida_util_horas numeric(10,2) not null default 0,
  tarifa_kwh numeric(10,4) not null default 0.98,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maquinas_company on maquinas(company_id);

-- RLS: liberado, igual ao padrão já usado nas demais tabelas (clientes, produtos, vendas...),
-- já que o app usa a chave anon direto no navegador.
alter table maquinas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'maquinas' and policyname = 'allow all maquinas'
  ) then
    create policy "allow all maquinas" on maquinas for all using (true) with check (true);
  end if;
end $$;

-- Garante que a tabela avise o app em tempo real quando mudar em qualquer PC
-- (usado por subscribeToMaquinas em src/lib/maquinasStorage.ts).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'maquinas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE maquinas;
  END IF;
END $$;

-- Força o PostgREST a recarregar o cache de schema agora, para o erro
-- "Could not find the table 'public.maquinas' in the schema cache" (404)
-- sumir imediatamente, sem esperar o Supabase detectar sozinho.
NOTIFY pgrst, 'reload schema';

