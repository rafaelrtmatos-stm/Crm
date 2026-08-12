-- Rode esse script no SQL Editor do Supabase
-- Guarda a ordem e quais abas horizontais de dentro do PDV (Terminal Venda, Historico, Estoque,
-- Servicos, Orcamentos, Contratos, Excluidos, Clientes) ficam visiveis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'pdv_menu_config'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN pdv_menu_config jsonb;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
