-- Rode esse script no SQL Editor do Supabase
-- Custo minimo configuravel por produto (m2, metro linear, etiqueta, insulfilm)
-- Ex: adesivo 0,1x0,1 daria R$0,90, mas se o valor minimo for R$20, cobra R$20
alter table produtos add column if not exists valor_minimo numeric(10,2);
NOTIFY pgrst, 'reload schema';
