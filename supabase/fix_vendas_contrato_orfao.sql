-- Rode esse SQL no Supabase — corrige vendas/notas que ficaram com o selo "Contrato"
-- preso mesmo depois do contrato ligado a elas ter sido excluído (bug anterior a essa correção)
update vendas
set contrato_id = null
where contrato_id in (
  select id from contratos where deleted_at is not null
);
