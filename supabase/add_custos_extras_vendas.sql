-- Custos extras/diretos de uma nota especifica (mao de obra, frete, aluguel de andaime,
-- insumo aplicado fora do estoque padrao, etc), separados do custo de material do estoque
-- de insumos (tabela produtos). Usado para compor o Lucro Liquido exato da nota, visivel
-- apenas para Admin/usuarios autorizados -- nunca exibido ao cliente.
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS custos_extras jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN vendas.custos_extras IS 'Array de {id, description, amount}: custos diretos extras lancados manualmente para essa nota (mao de obra, frete, andaime, etc). Oculto do cliente, usado so no calculo interno de lucro liquido.';
