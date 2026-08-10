-- Rode esse script no SQL Editor do Supabase e me manda o resultado das 3 consultas

-- 1) Confirma se o produto de teste realmente existe na tabela
SELECT id, name, unit, is_active, created_at
FROM produtos
ORDER BY created_at DESC
LIMIT 10;

-- 2) Mostra se RLS esta ligado na tabela produtos
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'produtos';

-- 3) Lista todas as policies (regras de acesso) da tabela produtos
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'produtos';
