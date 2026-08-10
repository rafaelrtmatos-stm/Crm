-- Rode esse script no SQL Editor do Supabase
-- Garante que a tabela vendas avise o sistema em tempo real quando mudar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'vendas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
  END IF;
END $$;
