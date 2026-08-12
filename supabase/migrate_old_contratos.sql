-- Rode esse script no SQL Editor do Supabase
-- Move os registros antigos que tinham sido marcados como "contrato" dentro da tabela
-- orcamentos (de uma abordagem anterior, antes dos Contratos terem tabela propria) pra
-- dentro da tabela contratos de verdade. Faz isso mesmo que algum campo esteja faltando
-- (ex: sem texto de contrato gerado, sem multa/juros definidos) - move do jeito que estiver.

DO $$
DECLARE
  linha RECORD;
  novo_id uuid;
  status_convertido text;
BEGIN
  FOR linha IN
    SELECT * FROM orcamentos WHERE document_type = 'contrato'
  LOOP
    -- Converte o status de orcamento pro vocabulario de status de contrato
    status_convertido := CASE linha.status
      WHEN 'enviado' THEN 'aguardando_aceite'
      WHEN 'aprovado' THEN 'aceito'
      WHEN 'em_producao' THEN 'em_execucao'
      WHEN 'recusado' THEN 'cancelado'
      WHEN 'expirado' THEN 'cancelado'
      WHEN 'concluido' THEN 'concluido'
      WHEN 'cancelado' THEN 'cancelado'
      ELSE 'rascunho'
    END;

    INSERT INTO contratos (
      numero, versao, cliente_id, customer_name, cpf_cnpj, phone, address, responsavel,
      venda_id, orcamento_id, items, desconto, total,
      forma_pagamento_texto, prazo_texto, multa_percentual, juros_percentual,
      observacoes, status, created_at, updated_at
    ) VALUES (
      COALESCE(linha.numero, 'CTR-' || substr(linha.id::text, 1, 6)),
      1,
      linha.cliente_id, linha.customer_name, linha.cpf_cnpj, linha.phone, linha.address, linha.responsavel,
      linha.venda_id, NULL, -- nao mantem vinculo com o orcamento antigo (era ele mesmo)
      COALESCE(linha.items, '[]'::jsonb), COALESCE(linha.desconto, 0), COALESCE(linha.total, 0),
      linha.forma_pagamento_texto, linha.prazo_pagamento_texto, COALESCE(linha.multa_percentual, 2), COALESCE(linha.juros_percentual, 1),
      linha.observacoes, status_convertido, linha.created_at, now()
    )
    RETURNING id INTO novo_id;

    -- Se essa "nota disfarçada" tinha uma venda vinculada, aponta ela pro contrato novo
    IF linha.venda_id IS NOT NULL THEN
      UPDATE vendas SET contrato_id = novo_id, orcamento_id = NULL WHERE id = linha.venda_id;
    END IF;

    -- Remove o registro antigo de dentro de orcamentos (ja foi movido)
    DELETE FROM orcamentos WHERE id = linha.id;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
