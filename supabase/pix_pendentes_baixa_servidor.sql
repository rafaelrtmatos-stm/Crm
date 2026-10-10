-- Confirmação de PIX pelo servidor também para o card de PIX (notas existentes), sem depender do navegador aberto.
-- baixa_em: trava de "quem deu a baixa" (navegador ou servidor) — só um consegue preencher, evitando baixa em dobro.
-- criado_por: id do usuário que abriu o card; o servidor usa para enviar o aviso de WhatsApp.
-- Idempotente. Rode no SQL Editor do Supabase.
alter table public.pix_pendentes add column if not exists baixa_em timestamptz;
alter table public.pix_pendentes add column if not exists criado_por text;

create index if not exists idx_pix_pendentes_card_sem_baixa
  on public.pix_pendentes (criado_em)
  where baixa_em is null and sale_id is not null;

notify pgrst, 'reload schema';
