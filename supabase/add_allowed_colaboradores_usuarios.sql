-- Rode esse SQL no Supabase — permite o admin liberar, em Usuários, quais cards de funcionários
-- (Financeiro → Funcionários) cada usuário pode ver, além do card do funcionário anexado à conta dele.
-- Guarda uma lista com os IDs dos colaboradores liberados.

alter table usuarios add column if not exists allowed_colaboradores jsonb;
