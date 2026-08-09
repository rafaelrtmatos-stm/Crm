-- Rode esse script no SQL Editor do Supabase
-- Garante que a tabela produtos avise o sistema em tempo real quando mudar
-- (sem isso, o Estoque atualiza mas o Terminal de Vendas, o Dashboard etc
-- so veem a mudanca quando a pagina e recarregada do zero)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'produtos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
  END IF;
END $$;
