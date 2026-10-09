-- Serviço anexado ao agendamento (tarefa agendada na conversa).
-- venda_id: nota (vendas) escolhida | orcamento_id: orçamento escolhido (ainda sem nota)
-- servico_nome: nome do serviço mostrado no card da Agenda (etiqueta/itens da nota, ou nome livre do "Criar novo")
alter table crm_agendamentos add column if not exists venda_id uuid;
alter table crm_agendamentos add column if not exists orcamento_id uuid;
alter table crm_agendamentos add column if not exists servico_nome text;
