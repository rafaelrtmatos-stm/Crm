-- Rode esse script no SQL Editor do Supabase
-- Estrutura: PRODUTO -> VARIAÇÕES -> CONSUMO DE MATÉRIA-PRIMA (integrado ao Estoque e ao Caixa)
-- Reutiliza a tabela "produtos" já existente tanto para o produto "pai" (vendável)
-- quanto para a matéria-prima (que já é um produto/insumo cadastrado no Estoque).

-- 1) VARIAÇÕES DE PRODUTO (ex: "ABA LATERAL" -> "Adesivo impresso" / "Adesivo automotivo")
create table if not exists produto_variacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  name text not null,
  sale_price numeric(12,2) not null default 0,
  cost_price numeric(12,2),
  is_active boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_produto_variacoes_produto on produto_variacoes(produto_id);

-- 2) CONSUMO DE MATÉRIA-PRIMA POR VARIAÇÃO (uma variação pode consumir 0, 1 ou várias matérias-primas)
-- material_produto_id aponta pra um produto/insumo já cadastrado no Estoque (não cria estoque paralelo)
create table if not exists variacao_consumos (
  id uuid primary key default gen_random_uuid(),
  variacao_id uuid not null references produto_variacoes(id) on delete cascade,
  material_produto_id uuid not null references produtos(id) on delete restrict,
  tipo_consumo text not null default 'fixo', -- 'fixo' | 'quantidade' | 'medida'
  quantidade numeric(12,4) not null default 0,
  unidade text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_variacao_consumos_variacao on variacao_consumos(variacao_id);
create index if not exists idx_variacao_consumos_material on variacao_consumos(material_produto_id);

alter table produto_variacoes enable row level security;
alter table variacao_consumos enable row level security;
create policy "allow all produto_variacoes" on produto_variacoes for all using (true) with check (true);
create policy "allow all variacao_consumos" on variacao_consumos for all using (true) with check (true);

-- 3) RASTREIO NA MOVIMENTAÇÃO DE ESTOQUE — pra vincular a baixa/estorno de matéria-prima à venda
-- e evitar baixa duplicada (idempotência), conforme item 15 do pedido.
alter table movimentacoes_estoque add column if not exists venda_id uuid;
alter table movimentacoes_estoque add column if not exists variacao_id uuid;
alter table movimentacoes_estoque add column if not exists variacao_nome text;

-- Evita duas baixas ('saida') ou dois estornos ('estorno') idênticos pro mesmo material,
-- na mesma venda. Ajustes de edição de pedido (tipo 'ajuste') não entram nessa trava,
-- pois uma venda pode ser editada mais de uma vez legitimamente.
create unique index if not exists uq_movimentacoes_estoque_venda_material_tipo
  on movimentacoes_estoque(venda_id, produto_id, tipo)
  where venda_id is not null and tipo in ('saida', 'estorno');

create index if not exists idx_movimentacoes_estoque_venda on movimentacoes_estoque(venda_id);
