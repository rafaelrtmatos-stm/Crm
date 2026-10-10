-- Notificação interna de PAGAMENTO RECEBIDO POR LINK (página pública /pagar/:token).
-- Uma linha por pagamento confirmado: o servidor (api/_lib/pagar-link.js, depois de dar a baixa na nota) grava aqui,
-- e o CRM (Realtime) toca o som de dinheiro UMA vez, mostra o aviso clicável e guarda no histórico do sino de pagamentos.
--
-- SEPARADA de crm_notifications DE PROPÓSITO: aquela tabela é "uma linha por conversa" (UNIQUE company_id + phone),
-- alimenta o sino de mensagens e o lembrete de 5 em 5 minutos (que é dirigido por leads.waiting_since). Esta aqui nunca
-- participa desse ciclo, então o aviso de pagamento não repete alarme.
--
-- Duplicidade: pendente_id (pix_pendentes.id) é UNIQUE. Se o provedor/e-mail disparar o mesmo evento mais de uma vez,
-- o segundo insert é ignorado. Dois pagamentos diferentes = duas pendências = duas notificações.
--
-- Rode esse SQL no SQL Editor do Supabase (idempotente). O código NÃO executa SQL sozinho.
-- Enquanto a tabela não existir, nada quebra: o servidor só registra um aviso no log e o CRM não mostra o sino de pagamentos.
create table if not exists public.crm_payment_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  -- Nota (vendas.id) paga; é o que o clique na notificação abre.
  sale_id text not null,
  link_id uuid,
  -- pix_pendentes.id do pagamento confirmado: chave de deduplicação.
  pendente_id uuid not null,
  cliente_nome text,
  -- Valor efetivamente recebido neste pagamento.
  valor_centavos integer not null check (valor_centavos > 0),
  total_centavos integer,
  -- Saldo da nota DEPOIS deste pagamento (0 = quitou).
  restante_centavos integer not null default 0,
  -- 'entrada' = pagamento parcial ("Entrada de R$ X recebida"); 'pagamento' = quitou ("Pagamento de R$ X recebido").
  tipo text not null check (tipo in ('entrada', 'pagamento')),
  criado_em timestamptz not null default now(),
  -- Preenchido quando alguém clica na notificação (ou marca como vista). Continua no histórico; só sai do contador.
  visualizada_em timestamptz,
  visualizada_por text,
  constraint crm_payment_notifications_pendente_key unique (pendente_id)
);

create index if not exists idx_crm_payment_notifications_company on public.crm_payment_notifications (company_id, criado_em desc);
create index if not exists idx_crm_payment_notifications_sale on public.crm_payment_notifications (sale_id);

alter table public.crm_payment_notifications enable row level security;
drop policy if exists "allow all crm_payment_notifications" on public.crm_payment_notifications;
create policy "allow all crm_payment_notifications" on public.crm_payment_notifications for all to public using (true) with check (true);

-- Realtime: o CRM recebe o INSERT na hora (som + aviso) e o UPDATE (visualizada) para sincronizar entre computadores.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'crm_payment_notifications'
  ) then
    alter publication supabase_realtime add table public.crm_payment_notifications;
  end if;
end $$;

notify pgrst, 'reload schema';
