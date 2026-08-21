-- Guarda de qual nota (vendas.id) e de qual item dela (indice no array items[]) um servico
-- de Comissoes foi puxado, quando ele veio da aba "Servicos" (puxar nota). Serve pra travar
-- duplicacao: o mesmo item da mesma nota nao pode ser adicionado duas vezes, mas se a nota
-- ganhar um item novo (indice novo), esse item novo continua podendo ser puxado normalmente.
alter table comissoes_servicos add column if not exists origem_nota_id text;
alter table comissoes_servicos add column if not exists origem_item_index integer;

create index if not exists idx_comissoes_servicos_origem_nota on comissoes_servicos(origem_nota_id) where origem_nota_id is not null;

NOTIFY pgrst, 'reload schema';
