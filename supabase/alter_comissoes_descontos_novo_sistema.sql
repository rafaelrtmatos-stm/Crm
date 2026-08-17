-- Adiciona coluna de débito/crédito automático e dívida parcelada
-- Comissões: sistema de débito/crédito correto e dívidas parceladas

-- Adicionar novas colunas à tabela comissoes_descontos
ALTER TABLE comissoes_descontos
ADD COLUMN IF NOT EXISTS criador_id uuid,
ADD COLUMN IF NOT EXISTS pode_deletar_colaborador boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS parcelas_total integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parcela_atual integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS valor_total_divida numeric DEFAULT NULL;

-- Criar índices pra performance
CREATE INDEX IF NOT EXISTS idx_comissoes_descontos_criador_id 
ON comissoes_descontos(criador_id);

CREATE INDEX IF NOT EXISTS idx_comissoes_descontos_pode_deletar 
ON comissoes_descontos(pode_deletar_colaborador);

-- Adicionar constraint pra garantir que parcelas fazem sentido
ALTER TABLE comissoes_descontos
DROP CONSTRAINT IF EXISTS check_parcelas_valid;

ALTER TABLE comissoes_descontos
ADD CONSTRAINT check_parcelas_valid 
CHECK (
  -- Se for dívida com parcelas, precisa ter ambas configuradas
  (tipo = 'divida' AND parcelas_total IS NOT NULL) 
  OR tipo != 'divida'
);

-- Notificar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
