-- Rode esse script no SQL Editor do Supabase (DEPOIS de create_comissoes_caixa_semanal.sql)
--
-- Adiciona a forma de pagamento (pix, dinheiro, permuta) em cada lançamento de
-- comissoes_pagamentos -- só informativo, não entra em nenhum cálculo do caixa (o saldo
-- continua sendo só pela soma dos valores, ver calcularResumoCaixa em
-- src/comissoes/utils/caixaSemanalStorage.ts). Serve pra saber depois COMO cada pagamento
-- foi feito (ex: bateu Pix, ou foi em produto/permuta).

alter table comissoes_pagamentos
  add column if not exists forma_pagamento text not null default 'pix';

-- Trava só nos 3 valores aceitos pela tela (pix | dinheiro | permuta)
alter table comissoes_pagamentos
  drop constraint if exists comissoes_pagamentos_forma_pagamento_check;
alter table comissoes_pagamentos
  add constraint comissoes_pagamentos_forma_pagamento_check
  check (forma_pagamento in ('pix', 'dinheiro', 'permuta'));

NOTIFY pgrst, 'reload schema';
