-- Separa definitivamente a etapa do pedido do lançamento para Serviços/Produção.
-- service_status = NULL -> pedido não foi lançado.
-- etapa_servico = etapa visual do pedido, podendo existir sem lançamento.

-- Novas vendas não devem herdar "pedido_recebido" como lançamento.
ALTER TABLE vendas
  ALTER COLUMN service_status DROP DEFAULT;

-- Corrige registros antigos que receberam automaticamente uma etapa inicial em service_status.
-- A etapa visual é preservada em etapa_servico.
UPDATE vendas
SET
  etapa_servico = COALESCE(NULLIF(btrim(etapa_servico), ''), service_status),
  service_status = NULL
WHERE service_status IN (
  'pedido_recebido',
  'aguardando_arte',
  'arte_em_desenvolvimento',
  'aguardando_aprovacao'
);

NOTIFY pgrst, 'reload schema';
