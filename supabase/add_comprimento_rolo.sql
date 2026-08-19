-- Rode esse SQL no Supabase — guarda o comprimento padrao da bobina (ex: 50 metros),
-- usado junto com largura_rolo (que ja existia) pra calcular metros comprados automaticamente
alter table produtos add column if not exists comprimento_rolo numeric(10,2);

NOTIFY pgrst, 'reload schema';
