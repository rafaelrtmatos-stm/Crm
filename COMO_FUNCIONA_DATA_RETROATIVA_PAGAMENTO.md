# Como Funciona: Data Retroativa de Pagamentos no Faturamento

## 📋 Resumo Executivo

**✅ Boas notícias!** O sistema **já implementa corretamente** o comportamento que você descreveu:

> "Se uma nota foi aberta hoje, mas você coloca pago ontem com a hora que tiver no pagamento, ela fica na hora do histórico e no dia do faturamento referido"

Isso significa:
- **Histórico**: Pagamento aparece com a data/hora que você digitou (ontem)
- **Faturamento**: Conta o valor no dia do pagamento (ontem), não no dia da nota (hoje)

---

## 🔍 Como o Sistema Funciona

### 1️⃣ Adicionando um Pagamento Retroativo

Quando você clica em **"Lançar com data/hora retroativa"** na tela de pagamento:

```
┌─────────────────────────────────────────────────────┐
│  Adicionar Pagamento                                │
├─────────────────────────────────────────────────────┤
│  Forma:  [Pix ▼]                                    │
│  Valor:  R$ 100,00                                  │
│  [+] Adicionar                                      │
│                                                      │
│  ⏱️ Lançar com data/hora retroativa                 │
│                                                      │
│  Data/Hora do Pagamento:                           │
│  ┌─────────────────────────────┐                   │
│  │ [2024-12-18 14:30]          │  ← Ontem, 14:30   │
│  └─────────────────────────────┘                   │
│  [X] (botão para cancelar)                         │
└─────────────────────────────────────────────────────┘
```

### 2️⃣ O Código que Salva a Data

**Arquivo:** `src/components/Modules.tsx` (linha ~885)

```typescript
// Quando você clica em "Adicionar" (confirmAddPayment):
const dataLancamento = useCustomPaymentDate && customPaymentDate 
  ? new Date(customPaymentDate).toISOString()    // ← Usa data retroativa
  : new Date().toISOString();                     // ← Ou usa data de agora

setPaymentEntries(prev => [...prev, { 
  method: newPaymentMethod, 
  value, 
  date: dataLancamento,  // ← Salva a data real do pagamento
  installments, 
  feePercent 
}]);
```

**O que acontece:**
- Se você digitou `2024-12-18 14:30`, a data é convertida para ISO: `2024-12-18T14:30:00.000Z`
- Se não digitou (normal), usa `new Date().toISOString()` (agora)
- O pagamento é salvo no array `payments` com a data correta

### 3️⃣ Histórico de Pagamentos

Os pagamentos são armazenados no banco como um array JSONB:

```json
{
  "id": "uuid-da-nota",
  "created_at": "2024-12-19T09:00:00.000Z",  ← Nota aberta hoje
  "payments": [
    {
      "date": "2024-12-18T14:30:00.000Z",    ← Pagamento de ontem
      "value": 100.00,
      "method": "pix"
    }
  ]
}
```

**Resultado visual no histórico:**
```
Nota: #001 (Aberta: 19/12/2024 09:00)
├─ Pagamento 1: R$ 100,00 — 18/12/2024 14:30 ✅
└─ Saldo: R$ 50,00
```

### 4️⃣ Faturamento por Data do Pagamento

**Arquivo:** `src/components/Modules.tsx` (linhas 641-652)

```typescript
function getRevenueEventsForSale(o: SaleOrder): { date: string; value: number }[] {
  if (o.payments && o.payments.length > 0) {
    return o.payments
      .filter(p => p.value > 0)
      .map(p => ({ 
        date: p.date || o.createdAt,  // ← Usa a data do pagamento!
        value: p.value 
      }));
  }
  // Fallback: nota antiga sem pagamentos detalhados
  const valor = o.status === 'pending' ? (o.downPayment || 0) : (o.total || 0);
  if (valor <= 0) return [];
  return [{ date: o.createdAt, value: valor }];  // ← Usa data da nota
}
```

**O que isso faz:**
- Cada pagamento é convertido em um "evento de receita"
- Cada evento tem: `{ date: "quando o pagamento foi feito", value: "quanto" }`
- O faturamento soma esses eventos **pela data do pagamento**, não da nota

### 5️⃣ Cálculo do Faturamento Diário

**Arquivo:** `src/components/Modules.tsx` (linhas 1107-1122)

```typescript
const calcPeriodo = (desde: Date) => {
  const vendasNaoCanceladas = realSales.filter(o => o.status !== 'canceled');
  
  // Faturamento conta pela data de CADA pagamento (não a data de criação da nota)
  const faturamento = vendasNaoCanceladas
    .flatMap(getRevenueEventsForSale)           // ← Expande cada venda em seus pagamentos
    .filter(ev => new Date(ev.date) >= desde)  // ← Filtra pelo período desejado
    .reduce((acc, ev) => acc + ev.value, 0);   // ← Soma os valores
  
  return { faturamento, lucro: Math.max(0, faturamento - custo), count };
};
```

**Exemplo real:**
```
Dia 19/12/2024 (hoje):
├─ Nota #001: Aberta hoje, R$ 100
│  └─ Pagamento: 18/12 14:30 → NÃO conta no faturamento de hoje ❌
│
Dia 18/12/2024 (ontem):
├─ Nota #001: Aberta hoje, R$ 100
│  └─ Pagamento: 18/12 14:30 → CONTA no faturamento de ontem ✅
│
Resultado: Faturamento de 18/12 = R$ 100
           Faturamento de 19/12 = R$ 0
```

---

## 🧪 Teste na Prática

### Cenário 1: Nota aberta hoje, pagamento ontem

1. **Hoje (19/12 09:00):** Cria uma nota de R$ 100
2. **Ainda agora:** Clica em "Pagar" → "Lançar com data/hora retroativa"
3. **Digita:** `2024-12-18 14:30` (ontem)
4. **Valor:** R$ 100
5. **Confirma**

**Resultado esperado:**
- ✅ Nota aparece como "Paga" 
- ✅ Histórico mostra: "Pagamento de R$ 100 em 18/12/2024 14:30"
- ✅ Faturamento de ontem (18/12) aumenta R$ 100
- ✅ Faturamento de hoje (19/12) permanece em R$ 0

### Cenário 2: Múltiplos pagamentos em datas diferentes

1. **Nota:** R$ 300
2. **Pagamento 1:** R$ 100 em 18/12 10:00
3. **Pagamento 2:** R$ 100 em 19/12 14:30
4. **Pagamento 3:** R$ 100 em 20/12 09:00

**Resultado:**
```
Faturamento 18/12: R$ 100 (pagamento 1)
Faturamento 19/12: R$ 100 (pagamento 2)
Faturamento 20/12: R$ 100 (pagamento 3)

Histórico da Nota:
├─ Pago em 18/12 10:00: R$ 100
├─ Pago em 19/12 14:30: R$ 100
└─ Pago em 20/12 09:00: R$ 100
```

---

## 📊 Onde Isso é Usado

### 1. Dashboard / Análise Detalhada
- **Local:** Aba "Dashboard" → "Análise Detalhada"
- **Mostra:** Faturamento por período (dia/mês/ano)
- **Usa:** `getRevenueEventsForSale()` para agrupar por data de pagamento

### 2. Histórico de Notas
- **Local:** Aba "Histórico" → Lista de notas
- **Mostra:** Cada pagamento com sua data/hora
- **Campo:** `payments` array da venda

### 3. Faturamento Hoje
- **Cálculo:** Soma todos os pagamentos com `date` de hoje
- **Código:** `faturamentoHoje` (linhas ~990)
```typescript
const faturamentoHoje = useMemo(() => {
  const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
  return allSalesHistory
    .filter(o => o.status !== 'canceled')
    .flatMap(getRevenueEventsForSale)        // ← Expande em pagamentos
    .filter(ev => {
      const d = new Date(ev.date);
      return d >= inicioHoje && d <= fimHoje;  // ← Filtra só de hoje
    })
    .reduce((acc, ev) => acc + ev.value, 0);
}, [allSalesHistory]);
```

---

## ⚙️ Estrutura do Banco de Dados

### Tabela: `vendas`

```sql
CREATE TABLE vendas (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,           -- Quando a nota foi criada (19/12 09:00)
  payments JSONB DEFAULT '[]',      -- Array de pagamentos
  -- ... outros campos
);
```

### Estrutura do `payments` array:

```jsonb
[
  {
    "date": "2024-12-18T14:30:00.000Z",  -- Data retroativa
    "value": 100.00,                     -- Valor pago
    "method": "pix",                     -- Forma de pagamento
    "installments": 1,                   -- Nº de parcelas (se cartão)
    "feePercent": 0                      -- Taxa aplicada (se houver)
  }
]
```

---

## 🔧 Se Quiser Customizar

### 1. Mudar o fuso horário

O código usa ISO 8601 direto. Se quiser exibir com fuso horário específico:

```typescript
// Antes (sem fuso explícito):
const dataLancamento = new Date(customPaymentDate).toISOString();
// 2024-12-18T14:30:00.000Z

// Depois (com fuso São Paulo):
const date = new Date(customPaymentDate);
date.setHours(date.getHours() - 3);  // Ajusta para UTC-3
const dataLancamento = date.toISOString();
```

### 2. Permitir editar a data depois

Atualmente, a data é fixada ao adicionar o pagamento. Se quiser permitir editar:

```typescript
// Adicionar um botão "Editar" no histórico
const handleEditPaymentDate = (paymentIndex: number, newDate: string) => {
  setEditingPaymentsList(prev => {
    const updated = [...prev];
    updated[paymentIndex].date = new Date(newDate).toISOString();
    return updated;
  });
};
```

### 3. Auditoria de pagamentos retroativos

Se quiser saber quando foi **registrado** vs quando foi **pago**:

```typescript
// Adicionar campo de auditoria:
{
  "date": "2024-12-18T14:30:00.000Z",    // Data do pagamento
  "value": 100.00,
  "method": "pix",
  "registered_at": "2024-12-19T09:15:00.000Z"  // Quando foi lançado
}
```

---

## ✅ Checklist: Tudo Está Funcionando?

- [ ] Cliquei em "Pagar" na nota
- [ ] Vi a opção "Lançar com data/hora retroativa"
- [ ] Digitei uma data no passado (ex: ontem)
- [ ] Confirmi o pagamento
- [ ] O histórico mostra a data que digitei (não de hoje)
- [ ] No Dashboard/Análise, o faturamento de ontem aumentou
- [ ] No Dashboard, o faturamento de hoje NÃO incluiu esse pagamento

Se todos acima estão ✅, **está tudo funcionando perfeitamente!**

---

## 📚 Código-Chave Resumido

| Arquivo | Linha | Função |
|---------|-------|--------|
| Modules.tsx | ~470-480 | Estados: `useCustomPaymentDate`, `customPaymentDate` |
| Modules.tsx | ~885 | Salva pagamento com data retroativa |
| Modules.tsx | 641-652 | `getRevenueEventsForSale()` — converte pagamentos em eventos |
| Modules.tsx | 1107-1122 | `calcPeriodo()` — soma faturamento por período |
| Modules.tsx | ~990 | `faturamentoHoje` — cálculo diário |

---

## 🎯 Conclusão

**O sistema já faz exatamente o que você pediu!** 

A data/hora retroativa é:
1. ✅ Coletada via campo `datetime-local`
2. ✅ Salva no array `payments` da venda
3. ✅ Usada no faturamento (não no dia da nota, mas no dia do pagamento)
4. ✅ Exibida no histórico com a data correta

Nenhuma mudança é necessária — está pronto para usar! 🚀

