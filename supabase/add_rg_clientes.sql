-- Rode esse script no SQL Editor do Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'rg'
  ) THEN
    ALTER TABLE clientes ADD COLUMN rg text;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
