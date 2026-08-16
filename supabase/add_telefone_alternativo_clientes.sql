-- Rode esse script no SQL Editor do Supabase
-- Um cliente pode ter 2 numeros de telefone. Quando o sistema detecta e mescla um cadastro
-- duplicado (mesmo CPF/CNPJ, ou mesmo nome completo com confirmacao do operador) e o numero
-- novo e' diferente do que ja estava salvo, ele vai pra essa coluna em vez de sobrescrever o
-- telefone principal.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'telefone_alternativo'
  ) THEN
    ALTER TABLE clientes ADD COLUMN telefone_alternativo text;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
