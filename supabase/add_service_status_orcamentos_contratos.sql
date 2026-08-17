-- Adiciona coluna service_status ao Orçamento
-- Esta coluna espelha as 8 etapas do Pedido (STAGE_ORDER)
-- Migração: Sistema Unificado de Etapas (Pedido ↔ Orçamento ↔ Contrato)

-- Adicionar service_status à tabela orcamentos
ALTER TABLE orcamentos 
ADD COLUMN IF NOT EXISTS service_status varchar DEFAULT 'pedido_recebido';

-- Adicionar índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_orcamentos_service_status 
ON orcamentos(service_status);

-- Adicionar service_status à tabela contratos
ALTER TABLE contratos 
ADD COLUMN IF NOT EXISTS service_status varchar DEFAULT 'pedido_recebido';

-- Adicionar índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_contratos_service_status 
ON contratos(service_status);

-- Adicionar constraint pra garantir valores válidos (8 etapas)
ALTER TABLE orcamentos 
DROP CONSTRAINT IF EXISTS orcamentos_service_status_check;

ALTER TABLE orcamentos 
ADD CONSTRAINT orcamentos_service_status_check 
CHECK (service_status IN (
  'pedido_recebido', 
  'aguardando_arte', 
  'arte_em_desenvolvimento', 
  'aguardando_aprovacao', 
  'producao', 
  'acabamento', 
  'aguardando_retirada', 
  'produto_entregue'
));

ALTER TABLE contratos 
DROP CONSTRAINT IF EXISTS contratos_service_status_check;

ALTER TABLE contratos 
ADD CONSTRAINT contratos_service_status_check 
CHECK (service_status IN (
  'pedido_recebido', 
  'aguardando_arte', 
  'arte_em_desenvolvimento', 
  'aguardando_aprovacao', 
  'producao', 
  'acabamento', 
  'aguardando_retirada', 
  'produto_entregue'
));

-- Notificar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
