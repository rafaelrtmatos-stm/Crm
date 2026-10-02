-- Separa "etapa do pedido" de "lançado para produção".
--   etapa_servico  = etapa do pedido (de pedido_recebido até produto_entregue).
--   service_status = lançado para produção (não nulo = a mão de obra aparece para o funcionário).
-- Assim "entregue" é só a última etapa e independe de o pedido estar lançado.

ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS etapa_servico text;

-- Pedidos lançados: a etapa que estava em service_status passa a ser copiada para etapa_servico
UPDATE vendas
SET etapa_servico = service_status
WHERE service_status IS NOT NULL
  AND btrim(service_status) <> ''
  AND etapa_servico IS NULL;

-- Pedidos entregues sem lançamento (entregue_em preenchido): etapa = produto_entregue, continuam sem lançar
-- (a coluna entregue_em fica sem uso; não é apagada aqui)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'entregue_em'
  ) THEN
    UPDATE vendas
    SET etapa_servico = 'produto_entregue'
    WHERE entregue_em IS NOT NULL
      AND etapa_servico IS NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
