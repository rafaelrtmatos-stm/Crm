-- Rode esse script no SQL Editor do Supabase
-- Campos para calculo por medida com aproveitamento de rolo (materiais como adesivo/lona em m2)
alter table produtos add column if not exists tipo_item text default 'produto';
alter table produtos add column if not exists controla_estoque boolean default true;
alter table produtos add column if not exists largura_rolo numeric(6,3);
alter table produtos add column if not exists estoque_maximo numeric(12,2);
alter table produtos add column if not exists localizacao text;
alter table produtos add column if not exists descricao text;

-- Historico de movimentacoes de estoque (entradas/saidas), nunca apagado
create table if not exists movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null,
  produto_nome text,
  tipo text not null, -- 'entrada' ou 'saida'
  quantidade numeric(12,3) not null,
  unidade text,
  motivo text,
  referencia text,
  observacao text,
  quantidade_anterior numeric(12,3),
  quantidade_posterior numeric(12,3),
  created_at timestamptz not null default now()
);
alter table movimentacoes_estoque enable row level security;
create policy "allow all movimentacoes_estoque" on movimentacoes_estoque for all using (true) with check (true);
