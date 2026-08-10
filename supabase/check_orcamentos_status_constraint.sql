-- PASSO 1: Rode isso primeiro pra ver se existe alguma restricao no campo status
SELECT conname, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conrelid = 'orcamentos'::regclass
  AND contype = 'c';
