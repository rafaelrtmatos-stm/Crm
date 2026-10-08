-- Etiqueta do serviço na nota (vem do campo "Qual é o serviço / produto?" do lead).
-- Aparece para o funcionário comissionado e pode ser editada no Histórico de Vendas.
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS servico_etiqueta TEXT;
