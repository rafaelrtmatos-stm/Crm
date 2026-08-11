-- Rode esse script no SQL Editor do Supabase

-- 1) Permissoes granulares por modulo (visualizar/criar/editar/excluir), guardadas como JSON
alter table usuarios add column if not exists module_permissions jsonb;

-- 2) Fila de Clientes em Espera (funcionalidade nova)
create table if not exists fila_espera (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cliente_telefone text,
  motivo text,
  status text not null default 'aguardando', -- aguardando | em_atendimento | finalizado
  waiting_started_at timestamptz not null default now(),
  waiting_ended_at timestamptz,
  waiting_duration_seconds integer,
  atendido_por text,
  created_at timestamptz not null default now()
);

alter table fila_espera enable row level security;
create policy "allow all fila_espera" on fila_espera for all using (true) with check (true);

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'fila_espera'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE fila_espera;
  END IF;
END $outer$;

NOTIFY pgrst, 'reload schema';
