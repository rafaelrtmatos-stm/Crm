-- Rode esse script no SQL Editor do Supabase
-- Garante TODAS as colunas que a importacao de produtos usa (seguro rodar de novo, nao apaga nada)
alter table produtos add column if not exists lote text;
alter table produtos add column if not exists validade text;
alter table produtos add column if not exists subcategoria text;
alter table produtos add column if not exists preco_atacado numeric(12,2);
alter table produtos add column if not exists provider text;
alter table produtos add column if not exists tipo_item text default 'produto';
alter table produtos add column if not exists controla_estoque boolean default true;
alter table produtos add column if not exists largura_rolo numeric(6,3);
alter table produtos add column if not exists estoque_maximo numeric(12,2);
alter table produtos add column if not exists localizacao text;
alter table produtos add column if not exists descricao text;

-- Forca o Supabase a atualizar o "schema cache" (o que estava causando o erro
-- mesmo que a coluna exista, se o cache nao foi atualizado)
NOTIFY pgrst, 'reload schema';
