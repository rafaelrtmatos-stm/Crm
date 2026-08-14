-- Rode esse script no SQL Editor do Supabase
-- Garante que as tabelas do app de Comissões avisem o sistema em tempo real
-- quando mudarem (sem isso, o painel de Comissões só vê a mudança quando a
-- página é recarregada do zero)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'colaboradores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE colaboradores;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'comissoes_servicos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comissoes_servicos;
  END IF;
END $$;
