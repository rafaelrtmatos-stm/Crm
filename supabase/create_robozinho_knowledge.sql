-- ============================================================
-- Robozinho Rafa — aba MEMÓRIA
-- Conhecimento da empresa, memória do cliente e conhecimentos
-- sugeridos (só entram em "conhecimento da empresa" depois que o
-- atendente aprova). NUNCA guarda preço/estoque/produto — isso
-- continua vindo ao vivo do PDV (tabela `produtos`).
-- ============================================================

create table if not exists robozinho_knowledge (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  tipo text not null default 'empresa', -- empresa | cliente | sugerido
  lead_id uuid references leads(id) on delete cascade, -- só usado quando tipo = 'cliente'
  titulo text,
  conteudo text,
  campos jsonb, -- memória do cliente: { veiculo, interesse, cor, orcamento, objecao, etapa, preferenciaContato }
  status text not null default 'approved', -- approved | suggested
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_robozinho_knowledge_company on robozinho_knowledge(company_id);
create index if not exists idx_robozinho_knowledge_lead on robozinho_knowledge(lead_id);
create index if not exists idx_robozinho_knowledge_tipo on robozinho_knowledge(tipo);

alter table robozinho_knowledge enable row level security;
create policy "allow all robozinho_knowledge" on robozinho_knowledge for all using (true) with check (true);

NOTIFY pgrst, 'reload schema';
