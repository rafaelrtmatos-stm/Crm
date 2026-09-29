-- Rode esse script no SQL Editor do Supabase (DEPOIS de create_comissoes.sql, que cria "colaboradores").
-- E idempotente: pode rodar de novo sem estragar nada.
--
-- Regras de negocio que essa estrutura garante:
--  1. IMPORTACAO NUNCA SOBRESCREVE: ponto_registros tem chave unica (funcionario_id, data). A importacao do
--     arquivo do relogio deve usar "insert ... on conflict (funcionario_id, data) do nothing" -- dia que ja
--     existe no sistema (inclusive corrigido a mao) e mantido; so dias novos entram.
--  2. O funcionario do relogio e identificado pelo NUMERO (ID do relogio), nao pelo nome.
--  3. Jornada editavel por dia da semana (padrao segunda a sabado), com vigencia: mudar a jornada vale dai
--     pra frente, sem recalcular dias passados.
--  4. Banco de horas com validade de 6 meses por credito. Ao vencer, o admin decide: pagar ou dar folga
--     (nada zera sozinho).

-- Foto do colaborador (usada na aba Financeiro/Comissoes no lugar das iniciais).
-- Upload no bucket "profile-photos" que ja existe (create_bucket_profile_photos.sql).
alter table colaboradores add column if not exists foto_url text;

-- Funcionarios do relogio de ponto, vinculados (opcional) a um colaborador do sistema.
create table if not exists ponto_funcionarios (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  numero_relogio text not null,          -- ID que vem no arquivo do relogio (1, 2, 3...)
  nome_relogio text,                     -- nome como veio no arquivo (so referencia)
  colaborador_id uuid references colaboradores(id) on delete set null,
  tolerancia_minutos integer not null default 10,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, numero_relogio)
);

-- Jornada prevista por dia da semana (0 = domingo ... 6 = sabado).
create table if not exists ponto_jornadas (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references ponto_funcionarios(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  trabalha boolean not null default true,
  entrada time,
  inicio_intervalo time,
  fim_intervalo time,
  saida time,
  vigente_desde date not null default current_date,
  created_at timestamptz not null default now(),
  unique (funcionario_id, dia_semana, vigente_desde)
);

-- Batidas de cada dia (ate 4: entrada, inicio/fim do intervalo, saida).
create table if not exists ponto_registros (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references ponto_funcionarios(id) on delete cascade,
  data date not null,
  entrada time,
  inicio_intervalo time,
  fim_intervalo time,
  saida time,
  origem text not null default 'importacao',      -- importacao | manual
  editado_manual boolean not null default false,  -- true = nunca substituir por importacao
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (funcionario_id, data)
);
create index if not exists idx_ponto_registros_data on ponto_registros(data);

-- Banco de horas: minutos positivos = credito (hora extra), negativos = debito (compensacao/folga/pagamento).
create table if not exists ponto_banco_horas (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references ponto_funcionarios(id) on delete cascade,
  data date not null,
  minutos integer not null,
  tipo text not null default 'extra',   -- extra | compensacao | folga | pagamento | ajuste
  validade date,                        -- so nos creditos: data + 6 meses (calculado pelo app)
  observacao text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ponto_banco_func on ponto_banco_horas(funcionario_id, data);

-- RLS no mesmo padrao "liberado" do resto do projeto.
alter table ponto_funcionarios enable row level security;
alter table ponto_jornadas enable row level security;
alter table ponto_registros enable row level security;
alter table ponto_banco_horas enable row level security;

drop policy if exists "allow all ponto_funcionarios" on ponto_funcionarios;
create policy "allow all ponto_funcionarios" on ponto_funcionarios for all using (true) with check (true);
drop policy if exists "allow all ponto_jornadas" on ponto_jornadas;
create policy "allow all ponto_jornadas" on ponto_jornadas for all using (true) with check (true);
drop policy if exists "allow all ponto_registros" on ponto_registros;
create policy "allow all ponto_registros" on ponto_registros for all using (true) with check (true);
drop policy if exists "allow all ponto_banco_horas" on ponto_banco_horas;
create policy "allow all ponto_banco_horas" on ponto_banco_horas for all using (true) with check (true);

NOTIFY pgrst, 'reload schema';
