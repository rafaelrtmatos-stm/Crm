# 🔧 Removido: Conceito de Caixa Aberto/Fechado

## O Que Mudou

Antes existia a ideia de "fechar o caixa da semana" (congela os totais,
abre uma nova semana) e "reabrir" pra corrigir. Isso foi removido.

## Como Funciona Agora

- Existe **UMA única linha de caixa por colaborador**, criada uma vez, nunca
  fechada nem trocada.
- O **saldo acumulado (dívida/crédito)** é sempre calculado ao vivo, somando
  TUDO desde que essa linha foi criada até hoje (salário de cada semana já
  lançada implicitamente pelos serviços, comissões, descontos e pagamentos
  com suas próprias datas).
- Os filtros **Semana / Mês / Ano** no card do Caixa continuam existindo,
  mas agora filtram os mesmos dados vivos (services/descontos/pagamentos)
  pela data de cada lançamento -- não dependem mais de nenhum "caixa fechado".
- O **saldo final exibido** (dívida ou crédito do colaborador) nunca é
  cortado pelo filtro de período -- é sempre o acumulado real, porque uma
  dívida antiga não desaparece só porque você olhou "esta semana".

## Removido do Código

- `fecharCaixa()`, `reabrirCaixa()`, `getHistoricoCaixasFechados()`
- Campos `status`, `semanaFim`, `fechadoEm` da interface `WeeklyCaixa`
- Botão "Reabrir" e seção "Histórico de fechamentos" na tela

## Banco de Dados

As colunas antigas (`status`, `semana_fim`, `fechado_em`, `salario_base`,
`total_comissao`, `total_descontos`, `total_pago`, `saldo_final` na tabela
`comissoes_caixas_semanais`) **não foram removidas do banco** -- ficam sem
uso, mas não atrapalham. Se quiser limpar depois, dá pra rodar uma migration
de DROP COLUMN, mas não é necessário.
