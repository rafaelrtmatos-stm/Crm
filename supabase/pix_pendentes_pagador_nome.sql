-- Nome de quem pagou o PIX (lido do e-mail do Nubank), em maiúsculas. Aparece em vermelho na nota e no recibo.
-- O CPF/CNPJ do e-mail NÃO é guardado. Idempotente. Rode no SQL Editor do Supabase.
alter table public.pix_pendentes add column if not exists pagador_nome text;

notify pgrst, 'reload schema';
