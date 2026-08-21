-- Limpa vendas.contrato_id que aponta pra contrato ja excluido (soft-delete) ou que nem existe
-- mais no banco (purga definitiva). Bug anterior: excluir um contrato nao soltava esse vinculo,
-- entao a Nota continuava mostrando a etiqueta "Contrato" pra sempre. Rodar uma vez so.

update vendas
set contrato_id = null
where contrato_id is not null
  and contrato_id not in (
    select id from contratos where deleted_at is null
  );
