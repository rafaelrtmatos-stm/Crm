# 🔧 Restaurado: Fechamento Semanal do Caixa (todo sábado)

## O Que Mudou (de novo)

O `CAIXA_SEM_ABERTURA_FECHAMENTO.md` documentava uma mudança em que o caixa
deixava de "fechar" toda semana e passava a acumular tudo (salário, comissão,
descontos, pagamentos) desde o início do colaborador até hoje, sem nunca
zerar. Isso causou o bug relatado: o "Total Estimado" do Dashboard passou a
somar o histórico inteiro em vez de só a sobra/dívida da semana anterior
(ex: mostrando R$ 1.849,65 em vez de R$ 772,15).

Essa mudança foi revertida. **O caixa volta a fechar toda semana no sábado.**

## Como Funciona Agora

- Cada colaborador tem UM caixa com `status='aberto'`, sempre referente à
  semana de trabalho atual (domingo a sábado).
- Enquanto está aberto, o saldo é calculado ao vivo, mas **limitado à
  semana desse caixa** (nunca soma semanas de fora).
- **Fechamento automático**: toda vez que a tela carrega (Dashboard ou
  Descontos), o sistema verifica se a semana do caixa aberto já venceu
  (`semana_fim < hoje`). Se sim, fecha ela sozinho (congela o saldo
  calculado como snapshot) e abre a semana seguinte já trazendo esse saldo
  em `saldo_anterior` -- sem precisar de nenhum clique manual. Se várias
  semanas passaram sem ninguém abrir o app, ele fecha todas em sequência
  até chegar na semana atual.
- O **saldo acumulado (dívida/crédito) mostrado no Dashboard** volta a ser
  só o que realmente ainda não foi pago: a sobra congelada da(s) semana(s)
  anterior(es), não o histórico inteiro.
- Os filtros **Semana / Mês / Ano** no card "Caixa" (aba Descontos):
  semana atual calcula ao vivo; semanas passadas usam o snapshot já
  congelado no fechamento (não recalcula); Mês/Ano somam os snapshots das
  semanas fechadas que caem no intervalo + a semana aberta, se também
  cair nele.

## Arquivos Alterados

- `src/comissoes/utils/caixaSemanalStorage.ts` -- reintroduz `fecharCaixa`,
  `avancarCaixaSeNecessario` (fechamento automático), `getHistoricoCaixasFechados`
  e `getDataInicioColaborador`; `calcularResumoCaixa` volta a ser limitado à
  semana do caixa; `calcularResumoPorPeriodo` passa a usar os snapshots
  congelados em vez de recalcular tudo ao vivo.
- `src/comissoes/components/Dashboard.tsx` -- chama `avancarCaixaSeNecessario`
  ao carregar o caixa do colaborador.
- `src/comissoes/components/DescontosView.tsx` -- idem, e busca o histórico
  de caixas fechados pra alimentar a navegação por período.

## Banco de Dados

Nenhuma migration nova é necessária -- as colunas `status`, `semana_fim`,
`salario_base`, `total_comissao`, `total_descontos`, `total_pago`,
`saldo_final` e `fechado_em` já existiam na tabela
`comissoes_caixas_semanais` (ver `supabase/create_comissoes_caixa_semanal.sql`)
e nunca chegaram a ser removidas -- só estavam sem uso.
