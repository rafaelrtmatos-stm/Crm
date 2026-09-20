-- Rode esse script no SQL Editor do Supabase
-- Nota (venda) excluida devolve ao estoque a materia-prima que ela tinha baixado; restaurar a nota baixa de novo.
-- Esta coluna marca se a devolucao JA foi feita, para nunca devolver duas vezes nem baixar sem ter devolvido
-- (ex: nota excluida antes dessa atualizacao nao foi devolvida, entao ao restaurar nao baixa de novo).
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS mp_estoque_devolvido boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
