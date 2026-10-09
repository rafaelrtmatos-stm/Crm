-- DIAGNOSTICO (somente leitura, nao altera nada): semanas JA FECHADAS de colaboradores na modalidade META.
-- Mostra o que foi gravado no fechamento e a receita da loja daquela semana (mesma regra do app:
-- notas quitadas = status 'completed' ou entrada >= total, sem canceladas nem excluidas).
-- Compare "total_comissao/salario_base" gravados com a faixa de metas_valores que a receita_loja atinge.
-- Se o valor gravado for MENOR que o da faixa correta, a semana foi fechada com a receita errada (item 21).
SELECT
  c.nome,
  cx.semana_inicio,
  cx.semana_fim,
  cx.fechado_em,
  cx.salario_base,
  cx.total_comissao,
  cx.total_descontos,
  cx.total_pago,
  cx.saldo_final,
  COALESCE(r.receita_loja, 0) AS receita_loja_semana,
  c.metas_valores
FROM public.comissoes_caixas_semanais cx
JOIN public.colaboradores c ON c.id = cx.colaborador_id
LEFT JOIN LATERAL (
  SELECT SUM(v.total) AS receita_loja
  FROM public.vendas v
  WHERE v.deleted_at IS NULL
    AND v.created_at >= (cx.semana_inicio::text || 'T00:00:00-03:00')::timestamptz
    AND v.created_at <  ((cx.semana_fim + 1)::text || 'T00:00:00-03:00')::timestamptz
    AND COALESCE(v.status, '') <> 'canceled'
    AND COALESCE(v.total, 0) > 0
    AND (v.status = 'completed' OR COALESCE(v.down_payment, 0) >= v.total)
) r ON true
WHERE cx.status = 'fechado'
  AND c.modalidade_remuneracao = 'meta'
ORDER BY c.nome, cx.semana_inicio DESC;
