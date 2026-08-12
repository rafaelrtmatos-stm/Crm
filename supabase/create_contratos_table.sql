-- Rode esse script no SQL Editor do Supabase
-- Cria a tabela de Contratos, separada de Orcamentos, vinculada por relacionamento
-- (nao duplica dado — so referencia cliente/orcamento/venda pelo id)

create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  company_id text,
  numero text not null,
  versao integer not null default 1,
  contrato_anterior_id uuid references contratos(id),
  cliente_id uuid references clientes(id) on delete set null,
  customer_name text not null,
  cpf_cnpj text,
  phone text,
  address text,
  venda_id uuid references vendas(id) on delete set null,
  orcamento_id uuid references orcamentos(id) on delete set null,
  items jsonb not null default '[]',
  desconto numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  forma_pagamento_texto text,
  prazo_texto text,
  observacoes text,
  texto_contrato text,
  -- status especifico de contrato (diferente do status de orcamento)
  status text not null default 'rascunho', -- rascunho | aguardando_aceite | aceito | em_execucao | concluido | cancelado | encerrado
  responsavel text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contratos_cliente on contratos(cliente_id);
create index if not exists idx_contratos_venda on contratos(venda_id);
create index if not exists idx_contratos_orcamento on contratos(orcamento_id);
create index if not exists idx_contratos_status on contratos(status);
create index if not exists idx_contratos_created on contratos(created_at desc);

alter table contratos enable row level security;
drop policy if exists "allow all contratos" on contratos;
create policy "allow all contratos" on contratos for all using (true) with check (true);

-- Vinculo reverso do orcamento pro contrato (pra tela do orcamento poder mostrar
-- "Contrato nº X — Status: Y" com botao Abrir Contrato, sem precisar de busca reversa)
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES contratos(id);

-- vendas.contrato_id ja existia de uma migration anterior (add_contrato_document_type.sql) —
-- so muda o que ele referencia: antes apontava pra uma linha de orcamentos com document_type='contrato',
-- agora aponta pra tabela contratos de verdade. Nao precisa alterar o tipo da coluna (ambas uuid).

NOTIFY pgrst, 'reload schema';
