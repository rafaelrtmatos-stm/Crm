-- Adiciona ao contrato os mesmos campos estruturados de pagamento e prazo
-- que já existem em orçamentos, para paridade total entre os dois documentos.

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS prazo_dias integer,
  ADD COLUMN IF NOT EXISTS prazo_tipo text,
  ADD COLUMN IF NOT EXISTS prazo_gatilho text,
  ADD COLUMN IF NOT EXISTS prazo_data_prevista date,
  ADD COLUMN IF NOT EXISTS prazo_pagamento_texto text,
  ADD COLUMN IF NOT EXISTS condicao_entrega_texto text,
  ADD COLUMN IF NOT EXISTS formas_pagamento jsonb,
  ADD COLUMN IF NOT EXISTS politica_pagamento text,
  ADD COLUMN IF NOT EXISTS entrada_obrigatoria boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS entrada_percentual numeric(10,4),
  ADD COLUMN IF NOT EXISTS entrada_valor numeric(12,2),
  ADD COLUMN IF NOT EXISTS pagamento_posterior_autorizado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pagamento_posterior_data date,
  ADD COLUMN IF NOT EXISTS pagamento_posterior_dias integer,
  ADD COLUMN IF NOT EXISTS pagamento_posterior_condicao text,
  ADD COLUMN IF NOT EXISTS pagamento_posterior_responsavel text,
  ADD COLUMN IF NOT EXISTS juros_modo text,
  ADD COLUMN IF NOT EXISTS dias_tolerancia integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multa_juros_texto text,
  ADD COLUMN IF NOT EXISTS garantia_texto text,
  ADD COLUMN IF NOT EXISTS politica_cancelamento_texto text,
  ADD COLUMN IF NOT EXISTS validade date;

NOTIFY pgrst, 'reload schema';
