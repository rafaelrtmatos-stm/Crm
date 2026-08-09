-- Rode esse script no SQL Editor do Supabase
-- Garante TODAS as colunas que a importacao de clientes usa (seguro rodar de novo, nao apaga nada)
alter table clientes add column if not exists phone text;
alter table clientes add column if not exists email text;
alter table clientes add column if not exists cpf_cnpj text;
alter table clientes add column if not exists cep text;
alter table clientes add column if not exists logradouro text;
alter table clientes add column if not exists numero text;
alter table clientes add column if not exists complemento text;
alter table clientes add column if not exists distrito text;
alter table clientes add column if not exists city text;
alter table clientes add column if not exists state text;
alter table clientes add column if not exists notes text;
alter table clientes add column if not exists nascimento text;
alter table clientes add column if not exists outros_documentos text;
alter table clientes add column if not exists dividas_em_aberto numeric(12,2);
alter table clientes add column if not exists limite_credito numeric(12,2) default 0;
alter table clientes add column if not exists patrimonios jsonb default '[]'::jsonb;
alter table clientes add column if not exists is_vip boolean default false;

-- Forca o Supabase a atualizar o "schema cache"
NOTIFY pgrst, 'reload schema';
