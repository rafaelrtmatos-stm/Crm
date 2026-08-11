-- Rode esse script no SQL Editor do Supabase
-- Faz o Orcamento tambem servir de Contrato (mesma tabela, mesmo PDF, so muda o "tipo" e o
-- cabecalho do documento gerado) e garante que Nota/Orcamento/Contrato fiquem linkados entre si.

-- 1) Tipo do documento: 'orcamento' ou 'contrato' (mesma tabela orcamentos serve pros dois)
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'orcamento';

-- 2) Uma venda pode ter um Orcamento E um Contrato vinculados ao mesmo tempo (gerados
--    separadamente a partir dela), entao precisa de duas colunas de link distintas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS contrato_id uuid;

-- 3) orcamento_id ja existia (venda -> orcamento). Garante que a venda tambem sabe voltar
--    pro orcamento/contrato que a originou, e vice versa (orcamentos.venda_id ja existia)
--    -- nada a fazer aqui, so documentando que essas colunas ja existem:
--    vendas.orcamento_id (venda -> orcamento)
--    vendas.contrato_id  (venda -> contrato)     [novo, criado acima]
--    orcamentos.venda_id (orcamento/contrato -> venda) [ja existia]

NOTIFY pgrst, 'reload schema';
