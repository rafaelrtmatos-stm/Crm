-- Rode esse script no SQL Editor do Supabase
-- Guarda o valor do desconto aplicado na venda (separado do total, que ja vem com o desconto descontado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendas' AND column_name = 'discount_value'
  ) THEN
    ALTER TABLE vendas ADD COLUMN discount_value numeric(12,2) DEFAULT 0;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
