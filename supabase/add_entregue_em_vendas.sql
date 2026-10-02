-- Separa "entregue" de "lançado na esteira de produção".
-- Antes, os dois usavam service_status: entregar = lançar, e desmarcar a produção
-- (service_status = null) apagava também o status de entregue.
-- Agora a entrega é guardada em entregue_em e independe do service_status.

ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS entregue_em timestamptz;

-- Pedidos que já estavam como 'produto_entregue' passam a ter a data de entrega registrada
UPDATE vendas
SET entregue_em = COALESCE(updated_at, created_at)
WHERE service_status = 'produto_entregue'
  AND entregue_em IS NULL;

NOTIFY pgrst, 'reload schema';
