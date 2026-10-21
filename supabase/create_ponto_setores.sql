-- Rode esse script no SQL Editor do Supabase (DEPOIS de create_ponto.sql). E idempotente.
-- Setores com horário (modelo de jornada semanal) e horário padrão da empresa.
--  * ponto_setores: cada setor tem um nome; "padrao = true" é o horário padrão da empresa
--    (usado quando um funcionário novo é cadastrado ou associado ao relógio).
--  * ponto_setor_jornadas: grade semanal do setor (0 = domingo ... 6 = sábado).
--  * ponto_funcionarios.setor_id: setor do funcionário (opcional).
-- O horário do setor é um MODELO: "Aplicar aos funcionários" copia para a jornada de cada um (ponto_jornadas);
-- dá para ajustar por funcionário depois, na aba Jornada.

create table if not exists ponto_setores (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  nome text not null,
  padrao boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, nome)
);

create table if not exists ponto_setor_jornadas (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references ponto_setores(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  trabalha boolean not null default true,
  entrada time,
  inicio_intervalo time,
  fim_intervalo time,
  saida time,
  unique (setor_id, dia_semana)
);

alter table ponto_funcionarios add column if not exists setor_id uuid references ponto_setores(id) on delete set null;

alter table ponto_setores enable row level security;
alter table ponto_setor_jornadas enable row level security;
drop policy if exists "allow all ponto_setores" on ponto_setores;
create policy "allow all ponto_setores" on ponto_setores for all using (true) with check (true);
drop policy if exists "allow all ponto_setor_jornadas" on ponto_setor_jornadas;
create policy "allow all ponto_setor_jornadas" on ponto_setor_jornadas for all using (true) with check (true);
