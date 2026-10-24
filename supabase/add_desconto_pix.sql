-- Desconto no Pix (QR Code + copia e cola enviado pelo WhatsApp).
-- O link de pagamento NÃO precisa desta migração: o desconto fica dentro de pagamento_links.opcoes (jsonb).
-- Já o QR/copia e cola registra a pendência em pix_pendentes, e a baixa automática (servidor) precisa saber
-- quanto de desconto foi concedido para quitar o saldo certo da nota:
--   valor_centavos        = valor FINAL cobrado no Pix (o que o e-mail do banco traz; regra de casamento inalterada)
--   desconto_centavos     = desconto concedido sobre o valor original (0 = sem desconto)
--   desconto_tipo/valor   = como o desconto foi definido (percentual -> %, fixo -> R$), só para histórico
-- Idempotente. Rode no SQL Editor do Supabase. O código NÃO executa SQL sozinho.
alter table public.pix_pendentes add column if not exists desconto_centavos integer not null default 0;
alter table public.pix_pendentes add column if not exists desconto_tipo text;
alter table public.pix_pendentes add column if not exists desconto_valor numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pix_pendentes_desconto_check') then
    alter table public.pix_pendentes
      add constraint pix_pendentes_desconto_check
      check (desconto_centavos >= 0 and desconto_centavos < valor_centavos + desconto_centavos);
  end if;
end $$;

notify pgrst, 'reload schema';
