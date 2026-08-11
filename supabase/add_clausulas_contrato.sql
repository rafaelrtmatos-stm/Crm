-- Rode esse script no SQL Editor do Supabase
-- Campo de texto livre com as clausulas do contrato (objeto, obrigacoes, LGPD, rescisao etc),
-- preenchido com um modelo profissional padrao ao criar um Contrato (documento_type='contrato'),
-- editavel depois. So orcamentos.status ja aceita qualquer texto (constraint removida antes),
-- entao o status novo 'encerrado' ja funciona sem precisar de mudanca nenhuma ali.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orcamentos' AND column_name = 'clausulas_contrato_texto'
  ) THEN
    ALTER TABLE orcamentos ADD COLUMN clausulas_contrato_texto text;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
