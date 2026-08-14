-- Rode esse script no SQL Editor do Supabase
-- Permite cadastrar, na mesma tela de "Adicionar Usuário" do CRM, uma conta cujo unico
-- acesso e a area de Comissoes. Esse usuario fica com role = 'comissao' na tabela
-- "usuarios" e vinculado (1:1) a um registro correspondente na tabela "colaboradores"
-- (que e quem efetivamente guarda os servicos/comissoes dele).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'colaborador_id'
  ) THEN
    ALTER TABLE usuarios
      ADD COLUMN colaborador_id uuid REFERENCES colaboradores(id) ON DELETE SET NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
