-- Rode esse script DEPOIS de create_contratos_table.sql
-- Adiciona colunas de multa/juros por atraso que faltavam na tabela contratos
-- (o codigo ja le/escreve nesses campos, so a tabela original nao tinha)

ALTER TABLE contratos ADD COLUMN IF NOT EXISTS multa_percentual numeric(5,2) DEFAULT 2;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS juros_percentual numeric(5,2) DEFAULT 1;

NOTIFY pgrst, 'reload schema';
