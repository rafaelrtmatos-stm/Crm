-- Permite que cada colaborador "dispense"/esconda uma nota da aba Serviços (dentro de
-- Comissoes) sem apagar a venda de verdade no PDV -- so deixa de aparecer pra aquele
-- colaborador especifico depois que ele ja adicionou (ou nao quer mais ver) aquela nota.
create table if not exists servicos_agendados_dispensados (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  venda_id uuid not null,
  created_at timestamptz not null default now(),
  unique (colaborador_id, venda_id)
);

alter table servicos_agendados_dispensados enable row level security;
create policy "allow all servicos_agendados_dispensados" on servicos_agendados_dispensados for all using (true) with check (true);

create index if not exists idx_servicos_dispensados_colaborador on servicos_agendados_dispensados(colaborador_id);

NOTIFY pgrst, 'reload schema';
