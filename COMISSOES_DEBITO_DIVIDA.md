# 💳 Sistema de Débito/Crédito e Dívida Parcelada - Comissões

## 🎯 O Problema Que Resolve

**Antes:**
```
Semana 1: Comissão 400,00 → Saldo final: -85,45 (caixa negativo)
Semana 2: Comissão 400,00 → Recebe 400,00 (deveria ser 314,55!)
```

**Depois:**
```
Semana 1: Comissão 400,00 → Saldo final: -85,45
Semana 2: Comissão 400,00
          - Débito saldo anterior: -85,45
          = Recebe: 314,55 ✅ CORRETO!
```

---

## ✨ Novo Sistema Implementado

### 1. **Débito Automático de Saldo Anterior**

Quando o caixa semanal fecha com saldo negativo (ex: -85,45), esse débito é **automaticamente criado** como um desconto tipo `debito_saldo_anterior` na semana seguinte.

```typescript
// Exemplo de código
const debito = calcularDebitoAutomatico(-85.45);
// Retorna:
{
  tipo: 'debito_saldo_anterior',
  descricao: 'Débito do saldo anterior: -R$ 85,45',
  valor: 85.45,
  recorrencia: 'unica',
  data: '2026-08-24'  // Hoje
}
```

**Comportamento:**
- ✅ Criado automaticamente (não precisa ação do admin)
- ❌ Colaborador **NÃO pode deletar**
- ✅ Admin pode deletar se precisar (corrigir erro)
- 📊 Aparece no resumo como: `📉 Débito Saldo Anterior: -R$ 85,45`

---

### 2. **Dívida Parcelada (Flexível)**

Permite que o colaborador tenha uma dívida (ex: empréstimo de 100,00) que pode ser:
- Dividida em **N parcelas**
- Paga **por semana** ou **por mês**

```typescript
// Exemplo: Dívida de 100,00 dividida em 4 semanas
const parcelas = gerarParcelasDivida(
  100.00,              // valor total
  4,                   // número de parcelas
  'semanal',           // tipo: 'semanal' ou 'mensal'
  '2026-08-24'         // data inicial
);

// Retorna:
[
  {
    tipo: 'divida',
    descricao: 'Dívida (1/4) - R$ 100,00 ÷ 4',
    valor: 25.00,
    recorrencia: 'semanal',
    data: '2026-08-24'  // Semana 1
  },
  {
    tipo: 'divida',
    descricao: 'Dívida (2/4) - R$ 100,00 ÷ 4',
    valor: 25.00,
    recorrencia: 'semanal',
    data: '2026-08-31'  // Semana 2
  },
  // ... Semanas 3 e 4
]
```

**Comportamento:**
- ✅ Parcelas criadas automaticamente (uma por semana/mês)
- ❌ Colaborador **NÃO pode deletar** dívida
- ✅ Admin pode deletar e refazer se precisar
- 📊 Aparece no resumo como: `💳 Dívida (1/4): -R$ 25,00`

---

## 📊 Resumo de Comissão (Exemplo Real)

```
COMISSÃO SEMANAL DE JOÃO
═══════════════════════════════════════════

Comissão Bruta:                  R$ 400,00
📉 Débito Saldo Anterior:        -R$ 85,45
⏰ Falta (meio período):         -R$ 20,00
💳 Dívida (1/4):                 -R$ 25,00
─────────────────────────────────────────
TOTAL A RECEBER:                 R$ 269,55 ✅

DETALHES:
• Débito da semana anterior (caixa -85,45)
• Falta segunda-feira de tarde (-20,00)
• Parcela 1/4 de dívida de empréstimo (-25,00)
```

---

## 🔧 Tipos de Desconto Suportados

| Tipo | Criador | Pode Deletar Colab? | Exemplo |
|------|---------|-------------------|---------|
| `falta_meio_periodo` | Todos | ✅ Sim* | Falta de tarde |
| `falta_periodo` | Todos | ✅ Sim* | Dia inteiro faltando |
| `outro` | Todos | ✅ Sim* | Adiantamento/empréstimo |
| `debito_saldo_anterior` | Sistema | ❌ Não | Saldo negativo semana anterior |
| `divida` | Admin | ❌ Não | Dívida parcelada |

*Pode ser marcado como não-deletável pelo admin (campo `pode_deletar_colaborador`)

---

## 🔐 Controle de Permissões

### Colaborador pode:
- ✅ Ver seus descontos
- ✅ Adicionar novo desconto (tipo 'outro', falta)
- ✅ Editar desconto próprio (se `pode_deletar_colaborador=true`)
- ✅ Deletar desconto próprio (se `pode_deletar_colaborador=true`)
- ❌ Deletar débito de saldo anterior
- ❌ Deletar dívida parcelada

### Admin pode:
- ✅ Ver descontos de todos
- ✅ Adicionar desconto pra qualquer colaborador
- ✅ Editar qualquer desconto
- ✅ **Deletar QUALQUER desconto** (inclusive débito/dívida)
- ✅ Marcar desconto como "não-deletável pelo colaborador"

---

## 💾 Banco de Dados

### Novo Schema

```sql
-- Tabela comissoes_descontos com novos campos:
ALTER TABLE comissoes_descontos
ADD COLUMN criador_id uuid,                    -- Quem criou
ADD COLUMN pode_deletar_colaborador boolean,   -- Colaborador pode deletar?
ADD COLUMN parcelas_total integer,             -- Total de parcelas
ADD COLUMN parcela_atual integer,              -- Parcela atual
ADD COLUMN valor_total_divida numeric;         -- Valor total da dívida
```

### Migration

```bash
# Executar no Supabase:
supabase/alter_comissoes_descontos_novo_sistema.sql
```

---

## 🚀 Como Usar (Na Prática)

### Scenario 1: Débito Automático

```
Sexta (fechamento de caixa):
  João tem comissão de R$ 400,00
  Gasta R$ 485,45 (débito de -R$ 85,45)
  Caixa é fechado

Segunda (abertura novo caixa):
  Sistema cria automaticamente:
    - Desconto tipo "debito_saldo_anterior" de R$ 85,45
    - Data: hoje
    - Pode deletar colaborador: NÃO
  
  Nova comissão: R$ 400,00
  Débito anterior: -R$ 85,45
  = Recebe: R$ 314,55
```

### Scenario 2: Dívida Parcelada

```
Admin clica: "Adicionar Dívida"
  Valor: R$ 100,00
  Tipo: Semana / Mês (escolhe)
  Parcelas: 4
  Data início: Hoje

Sistema cria 4 descontos:
  - Semana 1: -R$ 25,00 (data: hoje)
  - Semana 2: -R$ 25,00 (data: +7 dias)
  - Semana 3: -R$ 25,00 (data: +14 dias)
  - Semana 4: -R$ 25,00 (data: +21 dias)

João verá em cada semana:
  💳 Dívida (1/4): -R$ 25,00
  💳 Dívida (2/4): -R$ 25,00
  ... e assim por diante
```

### Scenario 3: Desconto Que Só Admin Pode Deletar

```
Admin cria desconto:
  Tipo: "Outro desconto"
  Descrição: "Uniforme"
  Valor: R$ 50,00
  Pode deletar colaborador: NÃO

João verá:
  "Uniforme: -R$ 50,00"
  [X] Botão de deletar DESABILITADO
  
Admin pode deletar a qualquer momento.
```

---

## 📝 Novos Campos da Interface Desconto

```typescript
interface Desconto {
  // Campos existentes:
  id: string;
  colaboradorId: string;
  tipo: DescontoTipo; // Novo: inclui 'debito_saldo_anterior' | 'divida'
  descricao?: string;
  valor: number;
  recorrencia: DescontoRecorrencia;
  data: string;
  ativo: boolean;
  createdAt: number;
  
  // ✨ NOVOS CAMPOS:
  criador_id?: string;                  // UUID do admin/colaborador que criou
  pode_deletar_colaborador?: boolean;   // Colaborador pode deletar? (default: true)
  parcelas_total?: number;              // Total de parcelas (ex: 4)
  parcela_atual?: number;               // Parcela atual (ex: 1)
  valor_total_divida?: number;          // Valor original da dívida
}
```

---

## ✅ Checklist de Implementação

- [x] Types e interfaces atualizadas
- [x] Tipos de desconto novos criados
- [x] Helpers de cálculo criados
- [x] Migration SQL criada
- [x] Validação de permissões implementada
- [ ] DescontosView.tsx atualizado (próximo passo)
- [ ] Formulário para criar dívida parcelada (próximo passo)
- [ ] Testar cálculo com débito/dívida (próximo passo)

---

## 🔗 Arquivos Modificados/Criados

| Arquivo | O quê |
|---------|-------|
| `src/comissoes/utils/supabaseStorage.ts` | Tipos e interfaces |
| `src/comissoes/utils/debitoEDividaHelpers.ts` | **NOVO** — Helpers de cálculo |
| `supabase/alter_comissoes_descontos_novo_sistema.sql` | **NOVO** — Migration |

---

## 🎓 Próximos Passos

1. **Executar migration** no Supabase
2. **Atualizar DescontosView.tsx** para:
   - Mostrar novo sistema de descontos
   - Adicionar formulário para criar dívida parcelada
   - Mostrar resumo correto: bruto - débitos = líquido
3. **Testar** cálculo de comissão com débito e dívida
4. **Deploy** para produção

---

## 📞 Dúvidas?

Veja os arquivos:
- `src/comissoes/utils/debitoEDividaHelpers.ts` — Toda a lógica
- `supabase/alter_comissoes_descontos_novo_sistema.sql` — Schema do banco

Funções principais:
- `calcularDebitoAutomatico()` — Desconto de saldo anterior
- `gerarParcelasDivida()` — Cria parcelas de dívida
- `resumirDescontos()` — Calcula resumo: bruto - débitos = líquido
- `podeDeleteDesconto()` — Valida permissões

