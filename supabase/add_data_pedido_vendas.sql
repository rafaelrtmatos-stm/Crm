-- Rode esse SQL no Supabase — data de ENTRADA do pedido (retroativa).
-- Preenchida só quando a nota é lançada no PDV com "Data do pedido" retroativa
-- (ex: pedido feito na segunda, anotado e pago na sexta). Na aba Serviços/Comissões ela
-- tem prioridade sobre a data de entrega, então a comissão cai no dia/semana do pedido.
-- O pagamento continua com a própria data (payments[].date).
alter table vendas add column if not exists data_pedido timestamptz;

NOTIFY pgrst, 'reload schema';
