-- Adiciona suporte a múltiplas modalidades de remuneração para funcionários/colaboradores:
-- 1. 'fixo': valor fixo semanal (salario_base)
-- 2. 'fixo_comissao': valor fixo semanal + % de comissão sobre a produção própria
-- 3. 'meta': % sobre produção própria com valor mínimo garantido (piso) e valor máximo (teto)

ALTER TABLE colaboradores
ADD COLUMN IF NOT EXISTS modalidade_remuneracao varchar DEFAULT 'fixo_comissao';

ALTER TABLE colaboradores
ADD COLUMN IF NOT EXISTS meta_percentual numeric(5,2) DEFAULT 0;

ALTER TABLE colaboradores
ADD COLUMN IF NOT EXISTS meta_valor_minimo numeric(12,2) DEFAULT 0;

ALTER TABLE colaboradores
ADD COLUMN IF NOT EXISTS meta_valor_maximo numeric(12,2) DEFAULT 0;

-- Notificar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
