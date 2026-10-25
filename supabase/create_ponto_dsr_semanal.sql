-- Rode no SQL Editor do Supabase (DEPOIS de create_ponto.sql). Idempotente.
--
-- Decisao do admin sobre o desconto do DSR (descanso semanal remunerado) por FUNCIONARIO + SEMANA do ponto.
--  * semana_inicio = sabado que abre o ciclo sabado-sexta do ponto (mesma chave de getWorkWeekBounds).
--  * desconta = true  -> o DSR da semana (1 diaria) e descontado, uma unica vez, mesmo com varias faltas.
--  * desconta = false -> a falta continua registrada, mas o DSR NAO e descontado.
--  * Sem linha para a semana = regra automatica (desconta quando ha falta injustificada), como era antes.
--  * Cada linha vale so para a sua semana: alterar uma semana nunca mexe nas outras.

create table if not exists ponto_dsr_semanal (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references ponto_funcionarios(id) on delete cascade,
  semana_inicio date not null,
  desconta boolean not null,
  alterado_por text,
  alterado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (funcionario_id, semana_inicio)
);
create index if not exists idx_ponto_dsr_semanal_func on ponto_dsr_semanal(funcionario_id, semana_inicio);

-- Historico (somente inclusao): quem mudou, quando e de/para o que.
create table if not exists ponto_dsr_historico (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references ponto_funcionarios(id) on delete cascade,
  semana_inicio date not null,
  desconta_anterior boolean,              -- null = estava no automatico (sem decisao salva)
  desconta_novo boolean not null,
  alterado_por text,
  alterado_em timestamptz not null default now()
);
create index if not exists idx_ponto_dsr_hist_func on ponto_dsr_historico(funcionario_id, semana_inicio, alterado_em desc);

alter table ponto_dsr_semanal enable row level security;
alter table ponto_dsr_historico enable row level security;
drop policy if exists "allow all ponto_dsr_semanal" on ponto_dsr_semanal;
create policy "allow all ponto_dsr_semanal" on ponto_dsr_semanal for all using (true) with check (true);
drop policy if exists "allow all ponto_dsr_historico" on ponto_dsr_historico;
create policy "allow all ponto_dsr_historico" on ponto_dsr_historico for all using (true) with check (true);

NOTIFY pgrst, 'reload schema';
