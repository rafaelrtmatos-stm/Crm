# 💳 Comissões: Semana Atual + Total Estimado

## Visão Geral

Sistema de cálculo correto de comissão semanal com:
- ✅ **Semana atual sempre selecionada**
- ✅ **Total Estimado = Saldo Caixa + Salário Base**
- ✅ **Descontos/Débitos já subtraídos**
- ✅ **Dívidas parceladas funcionando**

---

## Lógica de Cálculo

### Fórmula Principal

```
Total Estimado para Semana = Saldo do Caixa + Salário Base
```

### Exemplos

```
SEMANA 1:
Comissão: R$ 400,00
Saldo: +R$ 500,00 (lucro)
Salário Base: R$ 400,00
─────────────────────────
Total a Receber: R$ 400 + R$ 500 = R$ 900,00 ✅

SEMANA 2:
Comissão: R$ 400,00
Saldo: -R$ 100,00 (devendo)
Salário Base: R$ 400,00
─────────────────────────
Total a Receber: R$ 400 + (-R$ 100) = R$ 300,00 (Devendo)

SEMANA 3:
Comissão: R$ 400,00
Saldo: R$ 0,00 (zerado)
Salário Base: R$ 400,00
─────────────────────────
Total a Receber: R$ 400 + R$ 0 = R$ 400,00
```

---

## Componentes

### Helper: comissaoPrevistaHelpers.ts

```typescript
import {
  calcularComissaoSemanal,
  getSemanasProximas,
  formatarValorComissao,
  type ComissaoSemanal
} from '@/comissoes/utils/comissaoPrevistaHelpers';
```

### Funções Principais

#### 1. Calcular Comissão Semanal

```typescript
const comissao = calcularComissaoSemanal(
  -100,              // saldoCaixa (positivo ou negativo)
  400,               // salarioBase
  '2026-08-24',      // semanaInicio (YYYY-MM-DD)
  '2026-08-30'       // semanaFim (YYYY-MM-DD)
);

// Retorna:
{
  semanaInicio: '2026-08-24',
  semanaFim: '2026-08-30',
  saldoCaixa: -100,
  salarioBase: 400,
  totalEstimado: 300,  // 400 + (-100) = 300
  detalhes: 'Saldo negativo: -R$ 100,00 | Salário: R$ 400,00 = Total: R$ 300,00'
}
```

#### 2. Obter Semanas Próximas

```typescript
const semanas = getSemanasProximas(4);

// Retorna:
[
  {
    semanaInicio: '2026-08-17',
    semanaFim: '2026-08-23',
    label: 'Esta Semana (17/08)',  // ⭐ SELECIONADA POR PADRÃO
    isThisWeek: true
  },
  {
    semanaInicio: '2026-08-24',
    semanaFim: '2026-08-30',
    label: 'Semana 1 (24/08)',
    isThisWeek: false
  },
  // ... próximas semanas
]
```

#### 3. Formatar Valor

```typescript
formatarValorComissao(500);    // '+R$ 500,00'
formatarValorComissao(-100);   // '-R$ 100,00'
formatarValorComissao(0);      // '+R$ 0,00'
```

---

## Interface no Componente

### Seletor de Semana

```typescript
import { getSemanasProximas } from '@/comissoes/utils/comissaoPrevistaHelpers';

function ComissoesView({ colaboradorId }) {
  const semanas = getSemanasProximas(4);
  const [selectedWeek, setSelectedWeek] = useState(semanas[0]); // ⭐ Semana atual

  return (
    <div className="space-y-4">
      {/* Selector de Semana */}
      <select 
        value={selectedWeek.semanaInicio}
        onChange={(e) => {
          const week = semanas.find(w => w.semanaInicio === e.target.value);
          if (week) setSelectedWeek(week);
        }}
        className="px-3 py-2 bg-slate-800 text-white rounded"
      >
        {semanas.map(w => (
          <option key={w.semanaInicio} value={w.semanaInicio}>
            {w.label}
          </option>
        ))}
      </select>

      {/* Exibir dados da semana selecionada */}
      <ComissaoSemanalCard week={selectedWeek} colaboradorId={colaboradorId} />
    </div>
  );
}
```

### Card de Comissão Semanal

```typescript
interface ComissaoCardProps {
  week: { semanaInicio: string; semanaFim: string; label: string };
  colaboradorId: string;
}

function ComissaoSemanalCard({ week, colaboradorId }: ComissaoCardProps) {
  const [comissao, setComissao] = useState<ComissaoSemanal | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Buscar dados do caixa
        const caixa = await fetchCaixaSemanal(colaboradorId, week.semanaInicio);
        const salarioBase = await fetchSalarioBase(colaboradorId);

        // Calcular comissão
        const comissaoCalculada = calcularComissaoSemanal(
          caixa?.saldo || 0,
          salarioBase,
          week.semanaInicio,
          week.semanaFim
        );

        setComissao(comissaoCalculada);
      } finally {
        setLoading(false);
      }
    })();
  }, [week, colaboradorId]);

  if (loading) return <div>Carregando...</div>;
  if (!comissao) return null;

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      {/* Semana */}
      <p className="text-sm font-bold text-white/60">
        {comissao.semanaInicio} até {comissao.semanaFim}
      </p>

      {/* Saldo do Caixa */}
      <div className="flex justify-between items-center">
        <span className="text-sm">Saldo do Caixa:</span>
        <span className={cn(
          'font-bold',
          comissao.saldoCaixa > 0 ? 'text-emerald-400' : comissao.saldoCaixa < 0 ? 'text-rose-400' : 'text-slate-400'
        )}>
          {formatarValorComissao(comissao.saldoCaixa)}
        </span>
      </div>

      {/* Salário Base */}
      <div className="flex justify-between items-center">
        <span className="text-sm">Salário Base:</span>
        <span className="font-bold text-blue-400">
          R$ {comissao.salarioBase.toFixed(2)}
        </span>
      </div>

      {/* Total Estimado */}
      <div className="bg-primary-500/20 border border-primary-500/30 rounded-lg p-3">
        <p className="text-xs text-white/60 mb-1">Total Estimado para Receber:</p>
        <p className="text-2xl font-black text-primary-400">
          R$ {comissao.totalEstimado.toFixed(2)}
        </p>
        <p className="text-xs text-white/50 mt-2">{comissao.detalhes}</p>
      </div>

      {/* Descontos (se houver) */}
      <DescontosView
        colaboradorId={colaboradorId}
        baseSalary={comissao.salarioBase}
        descontos={descontos} // buscar via props ou state
      />
    </div>
  );
}
```

---

## Integração com Descontos

O total final (após descontos) fica:

```
Total Final = Total Estimado - Descontos Ativos
```

Exemplo:
```
Total Estimado: R$ 300,00
Débito Saldo Anterior: -R$ 85,45
Desconto Falta: -R$ 20,00
Dívida Parcela (1/4): -R$ 25,00
───────────────────────────
TOTAL FINAL A RECEBER: R$ 169,55
```

---

## Fluxo Completo

```
1. Abrir painel de Comissões
   ↓
2. Sistema detecta semana atual
   ↓
3. Selector está com "Esta Semana" selecionada ⭐
   ↓
4. Buscar dados:
   - Saldo do caixa da semana
   - Salário base do colaborador
   ↓
5. Calcular: saldoCaixa + salarioBase = totalEstimado
   ↓
6. Exibir no card com:
   - Breakdown (saldo + salário)
   - Total estimado destacado
   - Detalhes em texto
   ↓
7. Colaborador pode alterar semana no selector
   ↓
8. Recalcular automaticamente
```

---

## Estado do Comissão

### Props do DescontosView Atualizado

```typescript
interface DescontosViewProps {
  colaboradorId: string;
  // ✨ Novo: semana selecionada
  semanaInicio?: string;
  semanaFim?: string;
  
  // Resto existente
  descontos: Desconto[];
  isAdmin: boolean;
  onChange: (updated: Desconto[]) => void;
  baseSalary?: number;
  services?: ServiceItem[];
}
```

### Mostrar Comissão no Header

```typescript
// No header do DescontosView, adicionar:
<div className="flex justify-between items-center">
  <span className="text-sm font-bold">Comissão da Semana</span>
  <span className="text-lg font-black text-primary-400">
    R$ {comissaoSemanal.totalEstimado.toFixed(2)}
  </span>
</div>
```

---

## Checklist de Implementação

- [ ] Importar helpers do `comissaoPrevistaHelpers.ts`
- [ ] Adicionar selector de semana com semanas próximas
- [ ] Semana atual como padrão (`isThisWeek`)
- [ ] Buscar saldo caixa da semana selecionada
- [ ] Buscar salário base do colaborador
- [ ] Calcular `totalEstimado = saldoCaixa + salarioBase`
- [ ] Exibir no card com cores corretas
- [ ] Atualizar quando selector muda
- [ ] Integrar com descontos
- [ ] Testar com valores positivos, negativos e zero
- [ ] Testar mobile (responsividade)
- [ ] Testar desktop

---

## Exemplos Reais

### João (Semana com Saldo Positivo)

```
Esta Semana: 17/08 a 23/08

Comissão:        R$ 400,00
Saldo Caixa:     R$ 500,00 ✅ (positivo)
Salário Base:    R$ 400,00
─────────────────────────
TOTAL ESTIMADO:  R$ 900,00

Detalhes: Saldo positivo: +R$ 500,00 | Salário: R$ 400,00 = Total: R$ 900,00 ✅
```

### Maria (Semana com Débito)

```
Esta Semana: 17/08 a 23/08

Comissão:        R$ 400,00
Saldo Caixa:     -R$ 85,45 ❌ (devendo)
Salário Base:    R$ 400,00
─────────────────────────
TOTAL ESTIMADO:  R$ 314,55

Descontos:
- Débito Saldo Anterior: -R$ 85,45
- Desconto Falta:        -R$ 20,00
- Dívida (1/4):          -R$ 25,00
─────────────────────────
TOTAL FINAL:     R$ 184,10
```

### Pedro (Semana Zerada)

```
Esta Semana: 17/08 a 23/08

Comissão:        R$ 400,00
Saldo Caixa:     R$ 0,00 (zerado)
Salário Base:    R$ 400,00
─────────────────────────
TOTAL ESTIMADO:  R$ 400,00

Detalhes: Saldo zerado | Salário: R$ 400,00 = Total: R$ 400,00
```

---

## Dúvidas?

Veja os arquivos:
- `src/comissoes/utils/comissaoPrevistaHelpers.ts` — Toda a lógica
- `src/comissoes/utils/debitoEDividaHelpers.ts` — Descontos

