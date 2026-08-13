-- Rode esse script no SQL Editor do Supabase
-- Estrutura do app de Comissoes (colaboradores) - separado do sistema de usuarios do CRM

create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  nome text not null,
  senha text not null,
  cargo text,
  salario_base numeric(12,2) default 0,
  comissao_padrao_percentual numeric(5,2) default 10,
  meta_semanal numeric(12,2) default 0,
  tema text default 'dark',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table colaboradores enable row level security;
create policy "allow all colaboradores" on colaboradores for all using (true) with check (true);

create table if not exists comissoes_servicos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  data date not null,
  cliente_nome text,
  veiculo text,
  tipo_servico text not null,
  unidade text,
  quantidade numeric(12,2),
  valor_unitario numeric(12,2),
  valor_producao numeric(12,2) not null default 0,
  comissao_percentual numeric(5,2) not null default 0,
  comissao_valor numeric(12,2) not null default 0,
  status text not null default 'PENDENTE', -- CONCLUIDO | EM PRODUCAO | PENDENTE | CANCELADO
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table comissoes_servicos enable row level security;
create policy "allow all comissoes_servicos" on comissoes_servicos for all using (true) with check (true);

create index if not exists idx_comissoes_servicos_colaborador on comissoes_servicos(colaborador_id);
create index if not exists idx_comissoes_servicos_data on comissoes_servicos(data);

NOTIFY pgrst, 'reload schema';
