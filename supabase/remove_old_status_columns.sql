-- Remove colunas 'status' antigas do Orçamento e Contrato
-- AVISO: Execute DEPOIS de confirmar que service_status está funcionando!
-- Esta migration é irreversível — faça backup antes de executar!

-- PASSO 1: Backup dos dados antigos (criar tabela de histórico)
CREATE TABLE IF NOT EXISTS orcamentos_old_status_backup AS
SELECT id, status, created_at FROM orcamentos WHERE status IS NOT NULL;

CREATE TABLE IF NOT EXISTS contratos_old_status_backup AS
SELECT id, status, created_at FROM contratos WHERE status IS NOT NULL;

-- PASSO 2: Remover constraints que dependem do 'status' antigo
ALTER TABLE orcamentos DROP CONSTRAINT IF EXISTS check_orcamentos_status;
ALTER TABLE orcamentos DROP CONSTRAINT IF EXISTS orcamentos_status_check;
ALTER TABLE contratos DROP CONSTRAINT IF EXISTS check_contratos_status;
ALTER TABLE contratos DROP CONSTRAINT IF EXISTS contratos_status_check;

-- PASSO 3: Remover a coluna status antiga (se existir)
-- Comentado por segurança — descomente DEPOIS de backup
-- ALTER TABLE orcamentos DROP COLUMN IF EXISTS status;
-- ALTER TABLE contratos DROP COLUMN IF EXISTS status;

-- PASSO 4: Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- RESUMO:
-- ✅ Backup criado em: orcamentos_old_status_backup / contratos_old_status_backup
-- ✅ Constraints removidas
-- ⚠️  Coluna status NÃO foi removida ainda (remova manualmente depois de confirmar)
--
-- PRÓXIMOS PASSOS:
-- 1. Teste o novo sistema com service_status
-- 2. Confirme que tudo está funcionando
-- 3. Execute manualmente no Supabase:
--    ALTER TABLE orcamentos DROP COLUMN status;
--    ALTER TABLE contratos DROP COLUMN status;
-- 4. Se precisar voltar, use as tabelas de backup
