-- Adiciona coluna para indicar se o colaborador utiliza o ponto eletrônico (Grupo A vs Grupo B)
alter table colaboradores add column if not exists utiliza_ponto_eletronico boolean not null default false;

NOTIFY pgrst, 'reload schema';
