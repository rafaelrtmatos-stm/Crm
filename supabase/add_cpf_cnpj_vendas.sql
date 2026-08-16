-- Rode esse script no SQL Editor do Supabase
-- Guarda o CPF/CNPJ informado na hora de finalizar a venda (opcional, so quando o cliente
-- pede "CPF na nota"), sem precisar de cadastro completo de cliente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'cpf_cnpj'
  ) THEN
    ALTER TABLE vendas ADD COLUMN cpf_cnpj text;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
