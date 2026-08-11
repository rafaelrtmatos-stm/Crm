-- Rode esse script no SQL Editor do Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracoes' AND column_name = 'pix_key_type'
  ) THEN
    ALTER TABLE configuracoes ADD COLUMN pix_key_type text;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
