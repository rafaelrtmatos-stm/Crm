-- Link de pagamento PIX enviado ao cliente (página pública /pagar/:token).
-- O operador cria o link a partir de uma nota já salva ("Cobrar saldo via PIX" > "Link de pagamento"),
-- escolhendo quais valores o cliente pode pagar (ex.: entrada de 50% e/ou total). O cliente abre o link,
-- escolhe, paga por QR Code / copia e cola, e a confirmação automática (e-mail do Nubank) dá baixa na nota.
--
-- Rode esse SQL no SQL Editor do Supabase (idempotente). O código NÃO executa SQL sozinho.
create table if not exists public.pagamento_links (
  id uuid primary key default gen_random_uuid(),
  -- Token aleatório (32 hex) que vai na URL; é o "segredo" do link.
  token text not null unique,
  company_id text not null,
  -- Nota (vendas.id) que recebe a baixa quando o PIX for confirmado.
  sale_id text not null,
  -- Só o necessário para a página pública (nome abreviado e resumo dos itens).
  cliente_nome text,
  cliente_phone text,
  resumo text,
  total_centavos integer not null check (total_centavos > 0),
  restante_centavos integer not null check (restante_centavos >= 0),
  -- [{ "id": "metade", "label": "Entrada 50%", "valor_centavos": 5000 }, ...]
  opcoes jsonb not null,
  -- Dados do PIX da empresa no momento da criação: { key, keyType, beneficiaryName, city, bank }
  pix jsonb not null,
  status text not null default 'ativo',
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  -- Id do usuário que criou o link (usado para enviar a confirmação por WhatsApp pelo servidor).
  criado_por text,
  opcao_escolhida text,
  valor_pago_centavos integer,
  pago_em timestamptz,
  -- Preenchido quando a baixa na nota foi feita (impede dar baixa duas vezes).
  baixa_em timestamptz
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pagamento_links_status_check') then
    alter table public.pagamento_links
      add constraint pagamento_links_status_check
      check (status in ('ativo', 'pago', 'cancelado'));
  end if;
end $$;

create index if not exists idx_pagamento_links_sale on public.pagamento_links (sale_id);

alter table public.pagamento_links enable row level security;
drop policy if exists "allow all pagamento_links" on public.pagamento_links;
create policy "allow all pagamento_links" on public.pagamento_links for all to public using (true) with check (true);

notify pgrst, 'reload schema';
