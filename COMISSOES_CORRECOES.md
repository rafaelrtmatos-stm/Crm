# 🔧 Comissões - Correções Realizadas

## ✅ Correção 1: Filtro de Período (Esta Semana)

**Problema:**
- ❌ Filtro vinha marcado em "Mês Atual"
- ❌ calculateDescontosNoPeriodo usava monthBounds (1º a último dia do mês)

**Solução:**
- ✅ Criada função `getThisWeekBounds()` → retorna domingo a sábado
- ✅ Substituído `monthBounds` por `weekBounds`
- ✅ Agora abre com "Esta Semana" selecionada

**Código Aplicado:**
```typescript
// ANTES: getThisMonthBounds()
const monthBounds = useMemo(() => getThisMonthBounds(), []);

// DEPOIS: getThisWeekBounds()
const weekBounds = useMemo(() => getThisWeekBounds(), []);
```

---

## ⚠️  Problema 2: Cálculo da Comissão Está Errado

**Situação Atual:**
```
Débito Colaborador:  85,45
Salário Semanal:    400,00
─────────────────────────
Exibindo:           485,45 ❌ (ERRADO!)
```

**Deveria ser:**
```
Saldo do Caixa:     -85,45  (negativo = devendo)
Salário Semanal:    400,00
─────────────────────────
Total:              314,55  (400 - 85,45) ✅
```

---

## 🎯 Raiz do Problema

O sistema está recebendo o **saldo como positivo** quando deveria estar **negativo**.

### Exemplo do Banco:

Se o banco retorna:
```json
{
  "saldo": 85.45,
  "tipo": "deve"  // ou "devendo", "negativo", etc
}
```

**Precisamos converter para:**
```javascript
const saldoCorreto = tipo === 'deve' ? -85.45 : 85.45;
// Se tipo = 'deve' → saldoCorreto = -85.45 ✅
// Se tipo = 'a_receber' → saldoCorreto = +200.00 ✅
```

---

## 🔍 Onde Corrigir

Procure onde o saldo do caixa é buscado (provavelmente em `DescontosView.tsx` ou `ComissoesApp.tsx`):

```typescript
// ❌ ERRADO:
const saldoCaixa = caixa.saldo;  // 85.45 (sem sinal)

// ✅ CORRETO:
const saldoCaixa = caixa.tipo === 'deve' 
  ? -Math.abs(caixa.saldo)  // -85.45 (negativo)
  : Math.abs(caixa.saldo);  // +200.00 (positivo)
```

---

## 🏦 Checklist de Correção

**No código que BUSCA o saldo:**

```typescript
// 1. Buscar dados do caixa
const caixa = await fetchCaixaSemanal(colaboradorId, semana);
// caixa.saldo = 85.45
// caixa.tipo = 'deve'  (ou 'devendo', 'negativo', etc)

// 2. Corrigir o sinal
const saldoCorrigido = caixa.tipo === 'deve' 
  ? -caixa.saldo 
  : caixa.saldo;
// saldoCorrigido = -85.45

// 3. Calcular comissão
const totalEstimado = salarioBase + saldoCorrigido;
// 400 + (-85.45) = 314.55 ✅
```

---

## 📊 Exemplo Real

### JOÃO - Semana Com Débito

```
Caixa retorna do banco:
{
  saldo: 85.45,
  tipo: 'deve',
  semana_inicio: '2026-08-17',
  semana_fim: '2026-08-23'
}

Processa em comissões:
1. Buscar saldo: 85.45
2. Tem tipo 'deve'? SIM → multiplica por -1
3. saldoCorrigido = -85.45

4. Calcular:
   salarioBase = 400.00
   saldoCorrigido = -85.45
   ────────────────────
   Total = 314.55 ✅
```

---

## 📝 Onde Fazer a Correção

Procure em:

1. **`src/comissoes/components/DescontosView.tsx`**
   - Função que busca o caixa (provavelmente `getOrCreateCaixaAberto`)
   - Onde calcula `resumoCaixa`

2. **`src/comissoes/components/ComissoesApp.tsx`** ou similar
   - Onde exibe o total estimado
   - Antes de passarför o saldo para calcular

3. **`src/comissoes/utils/caixaSemanalStorage.ts`**
   - Na função `calcularResumoCaixa`
   - Que soma saldo + salário

---

## ✅ Depois de Aplicar a Correção

```
ANTES:
Débito:    85,45
Salário:   400,00
Total:     485,45  ❌

DEPOIS:
Débito:   -85,45
Salário:   400,00
Total:     314,55  ✅
```

---

## 🚀 Resumo das Mudanças

| Item | Antes | Depois |
|------|-------|--------|
| **Filtro Padrão** | Mês Atual | ✅ Esta Semana |
| **Bounds Usado** | `getThisMonthBounds()` | ✅ `getThisWeekBounds()` |
| **Saldo do Caixa** | 85,45 (positivo) | ✅ -85,45 (negativo) |
| **Total Estimado** | 485,55 ❌ | ✅ 314,55 |

---

## 📞 Código Helper

Se precisar corrigir o sinal em vários lugares, use:

```typescript
// src/comissoes/utils/comissaoPrevistaCorreco.ts
export function corrigirSaldoParaCalculo(valor: number, tipo: string): number {
  if (tipo === 'deve' || tipo === 'devendo' || tipo === 'negativo') {
    return -Math.abs(valor);
  }
  return Math.abs(valor);
}

// Uso:
const saldoCorreto = corrigirSaldoParaCalculo(caixa.saldo, caixa.tipo);
```

