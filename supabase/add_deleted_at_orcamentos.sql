-- Adiciona soft-delete (deleted_at) à tabela orcamentos
-- Sem essa coluna, excluir um Orçamento apagava o registro de vez (DELETE físico).
-- Com ela, a exclusão apenas marca a data e o registro pode ser restaurado depois
-- (mesmo padrão já usado em vendas, contratos e clientes).

ALTER TABLE orcamentos
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_orcamentos_deleted_at
ON orcamentos(deleted_at);

NOTIFY pgrst, 'reload schema';
