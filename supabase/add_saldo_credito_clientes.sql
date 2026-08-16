-- Saldo de crédito do cliente: acumulado quando o cliente paga em dinheiro e não retira o
-- troco (fica registrado como crédito), e abatido automaticamente em pedidos futuros dele.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_credito numeric(12,2) NOT NULL DEFAULT 0;
