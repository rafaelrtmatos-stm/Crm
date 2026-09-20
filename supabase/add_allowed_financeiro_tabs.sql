-- Rode esse script no SQL Editor do Supabase
-- Permissao granular: quais abas de dentro do Financeiro (Funcionarios, Materias-Primas,
-- Maquinas & Equipamentos, Precificacao) cada usuario pode ver. Coluna vazia (NULL) = ve todas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'allowed_financeiro_tabs'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN allowed_financeiro_tabs jsonb;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
