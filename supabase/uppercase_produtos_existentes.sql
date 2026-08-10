-- Rode esse script no SQL Editor do Supabase
-- Deixa em CAIXA ALTA os nomes de produtos que ainda estao com letra minuscula/mista
-- (a partir de agora, todo cadastro novo ja salva em caixa alta automaticamente)
UPDATE produtos
SET name = UPPER(name)
WHERE name <> UPPER(name);
