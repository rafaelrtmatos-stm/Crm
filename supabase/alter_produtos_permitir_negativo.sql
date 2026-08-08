-- Rode esse script no SQL Editor do Supabase
-- Garante que current_stock aceite valores negativos (existem produtos assim na planilha real)
-- Se existir alguma restricao (CHECK constraint) bloqueando negativo, isso remove.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'produtos'::regclass
      AND pg_get_constraintdef(oid) ILIKE '%current_stock%>%'
  LOOP
    EXECUTE format('ALTER TABLE produtos DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
