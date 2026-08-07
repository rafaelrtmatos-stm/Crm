-- Rode esse script no SQL Editor do Supabase
-- Adiciona colunas para casar com o modelo de planilha usado (clientes e produtos)

alter table clientes add column if not exists cep text;
alter table clientes add column if not exists logradouro text;
alter table clientes add column if not exists numero text;
alter table clientes add column if not exists complemento text;
alter table clientes add column if not exists distrito text;
alter table clientes add column if not exists nascimento text;
alter table clientes add column if not exists outros_documentos text;
alter table clientes add column if not exists dividas_em_aberto numeric(12,2) default 0;

alter table produtos add column if not exists subcategoria text;
alter table produtos add column if not exists preco_atacado numeric(12,2) default 0;
alter table produtos add column if not exists lote text;
alter table produtos add column if not exists validade date;
