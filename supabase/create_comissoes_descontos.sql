-- Rode esse script no SQL Editor do Supabase (DEPOIS de create_comissoes.sql)
-- Descontos lançados pelo admin na conta de um colaborador (falta meio período, falta
-- período completo, ou outro motivo qualquer) -- o colaborador só enxerga (aba "Descontos"
-- na visão dele), quem cria/edita/exclui é sempre o admin, pelo painel de Comissões do CRM.

create table if not exists comissoes_descontos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  tipo text not null default 'outro', -- falta_meio_periodo | falta_periodo | outro
  descricao text,
  valor numeric(12,2) not null default 0,
  recorrencia text not null default 'unica', -- unica | semanal | mensal
  data date not null, -- data do desconto (unica) ou data de inicio da recorrencia (semanal/mensal)
  ativo boolean not null default true, -- permite "pausar" um desconto recorrente sem apagar o historico
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mesmo padrão de permissão usado em colaboradores/comissoes_servicos: RLS ligado mas
-- policy permissiva -- o controle de quem pode criar/editar fica no front-end (só o
-- painel do admin tem os botões de escrita; a tela do colaborador só lê).
alter table comissoes_descontos enable row level security;
create policy "allow all comissoes_descontos" on comissoes_descontos for all using (true) with check (true);

create index if not exists idx_comissoes_descontos_colaborador on comissoes_descontos(colaborador_id);
create index if not exists idx_comissoes_descontos_data on comissoes_descontos(data);

NOTIFY pgrst, 'reload schema';
