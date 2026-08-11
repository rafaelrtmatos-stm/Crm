-- Rode esse script no SQL Editor do Supabase
-- Etapa atual do pedido (controla a linha de evolucao ja existente no recibo)
alter table vendas add column if not exists service_status text;
NOTIFY pgrst, 'reload schema';
