-- Confirmação automática de PIX (Nubank) por e-mail.
-- Cada vez que o card "Pagamento via PIX" abre (PDV e Vendas), o front registra uma linha aqui.
-- A rota /api/pix-email-check lê o Gmail e só dá baixa quando existe EXATAMENTE UMA pendência
-- em aberto com aquele valor e o e-mail ainda não foi usado por outra pendência.
--
-- Rode esse SQL no SQL Editor do Supabase (idempotente).
create table if not exists public.pix_pendentes (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  -- Venda relacionada, quando já existe. No PDV a venda só é criada ao confirmar, então fica nulo.
  sale_id text,
  valor_centavos integer not null check (valor_centavos > 0),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '30 minutes'),
  status text not null default 'pendente',
  -- Message-ID do e-mail do Nubank que confirmou o pagamento (nulo até o pagamento).
  email_message_id text,
  pago_em timestamptz
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pix_pendentes_status_check') then
    alter table public.pix_pendentes
      add constraint pix_pendentes_status_check
      check (status in ('pendente', 'pago', 'expirado'));
  end if;
end $$;

-- Um e-mail só pode confirmar UMA pendência (impede reutilizar o mesmo e-mail).
create unique index if not exists idx_pix_pendentes_email_message_id
  on public.pix_pendentes (email_message_id)
  where email_message_id is not null;

-- Consulta de pendências em aberto por valor.
create index if not exists idx_pix_pendentes_abertas
  on public.pix_pendentes (valor_centavos, expira_em)
  where status = 'pendente';

alter table public.pix_pendentes enable row level security;
drop policy if exists "allow all pix_pendentes" on public.pix_pendentes;
create policy "allow all pix_pendentes" on public.pix_pendentes for all to public using (true) with check (true);

notify pgrst, 'reload schema';
