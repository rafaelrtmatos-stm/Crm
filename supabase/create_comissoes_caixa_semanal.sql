-- Rode esse script no SQL Editor do Supabase (DEPOIS de create_comissoes.sql e
-- create_comissoes_descontos.sql)
--
-- "Caixa da semana" de cada colaborador: uma semana (segunda a sábado, mesmo padrão já usado
-- pro salário semanal em comissoes_descontos/DescontosView) sempre fica com status='aberto'
-- acumulando o que der (salário + comissão - descontos - pagamentos parciais já feitos). Quando
-- o admin FECHA essa semana, o saldo (positivo = empresa ainda deve ao colaborador; negativo =
-- colaborador ficou devendo) é congelado nessa linha e uma linha NOVA da semana seguinte já
-- nasce aberta, com esse saldo em saldo_anterior -- é assim que o saldo/dívida "anda" pra
-- semana seguinte automaticamente. Ver a lógica de cálculo/fechamento em
-- src/comissoes/utils/caixaSemanalStorage.ts.

create table if not exists comissoes_caixas_semanais (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  semana_inicio date not null, -- sempre uma segunda-feira
  semana_fim date not null,    -- sempre o sábado seguinte (6 dias depois, igual ao DIAS_UTEIS_SEMANA usado nos descontos)
  status text not null default 'aberto', -- aberto | fechado
  saldo_anterior numeric(12,2) not null default 0, -- saldo_final trazido da semana anterior (0 na primeira semana de cada colaborador)
  -- Os 4 campos abaixo só são preenchidos no FECHAMENTO (snapshot do que foi calculado
  -- naquele momento) -- enquanto status='aberto' eles ficam null e a tela calcula ao vivo
  -- em cima de comissoes_servicos/comissoes_descontos/comissoes_pagamentos.
  salario_base numeric(12,2),
  total_comissao numeric(12,2),
  total_descontos numeric(12,2),
  total_pago numeric(12,2),
  saldo_final numeric(12,2), -- saldo_anterior + salario_base + total_comissao - total_descontos - total_pago
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nunca duas semanas abertas (nem duplicadas) com o mesmo inicio pro mesmo colaborador
create unique index if not exists idx_caixas_semanais_colaborador_semana
  on comissoes_caixas_semanais(colaborador_id, semana_inicio);
create index if not exists idx_caixas_semanais_colaborador_status
  on comissoes_caixas_semanais(colaborador_id, status);

alter table comissoes_caixas_semanais enable row level security;
create policy "allow all comissoes_caixas_semanais" on comissoes_caixas_semanais for all using (true) with check (true);

-- Pagamentos parciais feitos ao colaborador DURANTE a semana (ex: adiantamento, vale, PIX
-- avulso) -- abatem do saldo final na hora de fechar o caixa daquela semana. Sempre lançado
-- pelo admin.
create table if not exists comissoes_pagamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  caixa_id uuid not null references comissoes_caixas_semanais(id) on delete cascade,
  valor numeric(12,2) not null default 0,
  data date not null,
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comissoes_pagamentos_caixa on comissoes_pagamentos(caixa_id);
create index if not exists idx_comissoes_pagamentos_colaborador on comissoes_pagamentos(colaborador_id);

alter table comissoes_pagamentos enable row level security;
create policy "allow all comissoes_pagamentos" on comissoes_pagamentos for all using (true) with check (true);

NOTIFY pgrst, 'reload schema';
