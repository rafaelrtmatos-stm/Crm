-- Rode esse script no SQL Editor do Supabase
-- Remove qualquer restricao (CHECK constraint) que esteja impedindo o status 'cancelado'
-- de ser salvo no orcamento (isso explicaria Aprovar funcionar e Cancelar nao)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'orcamentos'::regclass
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE orcamentos DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
