-- Rode esse script no SQL Editor do Supabase
-- Permissao granular: quais abas horizontais de dentro do PDV (Terminal Venda, Historico,
-- Estoque, Servicos, Orcamentos, Contratos, Excluidos, Clientes) cada usuario pode ver
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'allowed_pdv_tabs'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN allowed_pdv_tabs jsonb;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
