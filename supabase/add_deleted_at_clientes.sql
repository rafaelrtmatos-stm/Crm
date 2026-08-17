-- Rode esse script no SQL Editor do Supabase
-- Permite excluir clientes da Base de Contatos com uma "Lixeira" de 30 dias (mesmo padrao ja
-- usado em Vendas/Contratos): a exclusao so marca deleted_at, o cadastro some da lista principal
-- mas fica recuperavel por 30 dias antes de ser apagado de vez.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clientes_deleted_at ON clientes(deleted_at);

NOTIFY pgrst, 'reload schema';
