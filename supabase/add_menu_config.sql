-- Rode esse script no SQL Editor do Supabase
-- Guarda a ordem e quais abas do menu lateral principal ficam visiveis (configuravel pelo admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'menu_config'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN menu_config jsonb;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
