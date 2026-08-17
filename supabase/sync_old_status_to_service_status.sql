-- Sincroniza dados antigos (status) para o novo sistema (service_status)
-- Execute DEPOIS de rodar add_service_status_orcamentos_contratos.sql
-- ANTES de remover a coluna status antiga

-- Mapeamento de status antigos → service_status novo
-- Orçamentos antigos:
--   'em_espera' → 'pedido_recebido'
--   'aprovada' → 'aguardando_aprovacao'
--   'em_producao' → 'producao'
--   'recusada' → 'pedido_recebido' (volta ao início)
--   'concluido' → 'produto_entregue'

UPDATE orcamentos
SET service_status = CASE status
  WHEN 'em_espera' THEN 'pedido_recebido'
  WHEN 'aprovada' THEN 'aguardando_aprovacao'
  WHEN 'em_producao' THEN 'producao'
  WHEN 'recusada' THEN 'pedido_recebido'
  WHEN 'concluido' THEN 'produto_entregue'
  ELSE service_status
END
WHERE status IS NOT NULL 
  AND service_status = 'pedido_recebido'; -- Só atualiza os que ainda estão no default

-- Contratos antigos (mapeamento mais genérico)
--   'aguardando_assinatura_cliente' → 'aguardando_aprovacao'
--   'assinado' → 'producao'
--   'em_execucao' → 'producao'
--   'cancelado' → 'pedido_recebido'

UPDATE contratos
SET service_status = CASE status
  WHEN 'aguardando_assinatura_cliente' THEN 'aguardando_aprovacao'
  WHEN 'assinado' THEN 'producao'
  WHEN 'em_execucao' THEN 'producao'
  WHEN 'cancelado' THEN 'pedido_recebido'
  ELSE service_status
END
WHERE status IS NOT NULL 
  AND service_status = 'pedido_recebido'; -- Só atualiza os que ainda estão no default

-- Validar integridade
-- Mostrar quantos foram atualizados
SELECT 
  'orcamentos' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN service_status != 'pedido_recebido' THEN 1 END) as migrados
FROM orcamentos

UNION ALL

SELECT 
  'contratos' as tabela,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN service_status != 'pedido_recebido' THEN 1 END) as migrados
FROM contratos;

-- Notificar schema cache
NOTIFY pgrst, 'reload schema';
