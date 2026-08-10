-- Rode esse script no SQL Editor do Supabase
-- Cadastra o produto Etiqueta Adesiva (calculo especial de aproveitamento por metro linear)
insert into produtos (name, code, category, unit, sale_price, cost_price, current_stock, is_active, tipo_item, largura_rolo, controla_estoque)
values ('Etiqueta Adesiva', null, 'Adesivos', 'etiqueta', 120.00, 0, 0, true, 'produto', 1.02, true)
on conflict do nothing;
