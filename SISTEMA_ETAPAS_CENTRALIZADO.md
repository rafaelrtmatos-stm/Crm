# 🎯 Sistema Centralizado de Etapas/Status

## Visão Geral

Sistema único de gerenciamento de **etapas/classificações** que funciona em:
- ✅ Histórico de Pedidos
- ✅ Notas / Abertos
- ✅ Recibos Agendados
- ✅ Orçamentos
- ✅ Contratos

**Sem duplicação de código. Uma única lógica.**

---

## Arquitetura

### 📁 Arquivos Criados

```
src/components/StatusDropdown/
├── index.ts              # Exportações
├── StageConfig.ts        # ⚙️  Configuração Central
└── StageDropdown.tsx     # 🎨 Componente Reutilizável
```

### 🔧 Configuração Central (StageConfig.ts)

```typescript
// Etapas de Pedidos (8 etapas)
export const STAGES_PEDIDOS = [
  { id: 'pedido_recebido', label: 'Pedido Recebido', color: 'blue', icon: '📋' },
  { id: 'aguardando_arte', label: 'Aguardando Arte', color: 'slate', icon: '⏳' },
  // ... + 6 mais
]

// Etapas de Orçamentos (5 etapas)
export const STAGES_ORCAMENTOS = [
  { id: 'rascunho', label: 'Rascunho', color: 'slate', icon: '📝' },
  { id: 'enviado', label: 'Enviado', color: 'blue', icon: '📤' },
  // ... + 3 mais
]

// Etapas de Contratos (usa as mesmas de Pedidos)
export const STAGES_CONTRATOS = STAGES_PEDIDOS;
```

**Modificar uma etapa aqui = Atualiza tudo automaticamente!**

### 🎨 Componente Reutilizável (StageDropdown.tsx)

```typescript
import { StageDropdown, STAGES_PEDIDOS } from '@/components/StatusDropdown';

// Uso no Histórico de Pedidos
<StageDropdown
  group="pedidos"
  currentStage={pedido.etapa}
  onStageChange={async (novaEtapa) => {
    await updatePedidoEtapa(pedido.id, novaEtapa);
  }}
  size="md"
/>
```

---

## Etapas Disponíveis

### PEDIDOS/RECIBOS (8 etapas)

| Etapa | Icon | Cor | Descrição |
|-------|------|-----|-----------|
| Pedido Recebido | 📋 | Blue | Cliente fez pedido |
| Aguardando Arte | ⏳ | Slate | Esperando material de arte |
| Arte em Desenvolvimento | 🎨 | Cyan | Desenhista trabalhando |
| Aguardando Aprovação | ⏸️ | Amber | Cliente aprova arte |
| Produção | 🏭 | Indigo | Começou impressão |
| Acabamento | ✨ | Purple | Últimos retoques |
| Aguardando Retirada | 📦 | Emerald | Pronto pra buscar |
| Produto Entregue | ✅ | Emerald | ✅ Fechado |

### ORÇAMENTOS (5 etapas)

| Etapa | Icon | Cor | Descrição |
|-------|------|-----|-----------|
| Rascunho | 📝 | Slate | Sendo elaborado |
| Enviado | 📤 | Blue | Enviado ao cliente |
| Em Espera | ⏳ | Amber | Aguardando resposta |
| Aprovado | ✅ | Emerald | Cliente aprovou |
| Em Produção | 🏭 | Indigo | Começou produção |

### CONTRATOS

Usa as mesmas 8 etapas de **PEDIDOS/RECIBOS**.

---

## Como Usar

### 1. No Histórico de Pedidos

```typescript
import { StageDropdown } from '@/components/StatusDropdown';

function HistoricoPedidos() {
  const [pedidos, setPedidos] = useState([]);

  const handleChangeEtapa = async (pedidoId: string, novaEtapa: string) => {
    // Atualizar no banco
    await updatePedido(pedidoId, { etapa: novaEtapa });
    
    // Recarregar lista
    const updated = await fetchPedidos();
    setPedidos(updated);
  };

  return pedidos.map(pedido => (
    <div key={pedido.id} className="flex items-center gap-3">
      <span>{pedido.cliente}</span>
      
      {/* Dropdown de Etapas */}
      <StageDropdown
        group="pedidos"
        currentStage={pedido.etapa}
        onStageChange={(novaEtapa) => handleChangeEtapa(pedido.id, novaEtapa)}
        size="md"
      />
    </div>
  ));
}
```

### 2. No Orçamentos

```typescript
// Apenas mude group pra "orcamentos"
<StageDropdown
  group="orcamentos"
  currentStage={orcamento.status}
  onStageChange={async (novaEtapa) => {
    await updateOrcamento(orcamento.id, { status: novaEtapa });
  }}
/>
```

### 3. Em Qualquer Lugar

O componente é agnóstico — funciona em qualquer módulo!

---

## API do Componente

### Props

```typescript
interface StageDropdownProps {
  // Grupo de etapas: 'pedidos' | 'orcamentos' | 'contratos'
  group: StageGroup;
  
  // Etapa atual (ex: 'pedido_recebido')
  currentStage: string;
  
  // Callback quando etapa é alterada
  onStageChange: (stageId: StageName) => void | Promise<void>;
  
  // Desabilita o dropdown (readonly)
  disabled?: boolean;
  
  // Tamanho: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg';
  
  // Classe Tailwind customizada
  className?: string;
  
  // Se está salvando (desabilita enquanto salva)
  isSaving?: boolean;
}
```

### Helpers

```typescript
// Obter configuração de uma etapa
getStageConfig(stageId: StageName, group: StageGroup): StageConfig

// Obter rótulo de uma etapa
getStageLabelByGroup(stageId: string, group: StageGroup): string

// Obter classe de cor Tailwind
getStageColorClass(stageId: string, group: StageGroup): string
```

---

## Responsividade

### 📱 Mobile

- ✅ Dropdown abre **dentro da viewport**
- ✅ Não corta conteúdo
- ✅ Ocupa toda a largura disponível
- ✅ Suporta scroll interno se houver muitas etapas
- ✅ Toque fora fecha o dropdown

### 🖥️ Desktop

- ✅ Botão com largura automática
- ✅ Dropdown `min-w-[280px]`
- ✅ Posicionado corretamente (sem sair da viewport)
- ✅ Hover e transições suaves

---

## Contadores Automáticos

Para exibir contadores (TODOS 3, EM ESPERA 0, etc):

```typescript
import { STAGES_PEDIDOS } from '@/components/StatusDropdown';

function ContadoresEtapas() {
  const etapas = STAGES_PEDIDOS;
  
  // Contar pedidos por etapa
  const contadores = etapas.map(stage => ({
    stage: stage.label,
    count: pedidos.filter(p => p.etapa === stage.id).length
  }));

  return (
    <div className="flex gap-2">
      {contadores.map(c => (
        <button key={c.stage}>
          {c.stage.toUpperCase()} {c.count}
        </button>
      ))}
    </div>
  );
}
```

---

## Modificar Etapas

Se precisar **alterar nome, ordem ou cores**:

### ✏️ Editar StageConfig.ts

```typescript
// ANTES:
{ id: 'aguardando_arte', label: 'Aguardando Arte', color: 'slate', icon: '⏳' },

// DEPOIS:
{ id: 'aguardando_arte', label: 'Aguardando Material de Arte', color: 'blue', icon: '🎨' },
```

### ✅ Resultado

- Histórico de Pedidos → Atualiza ✅
- Notas / Abertos → Atualiza ✅
- Recibos Agendados → Atualiza ✅
- Orçamentos → Atualiza ✅
- Contratos → Atualiza ✅

**Zero código duplicado.**

---

## Exemplo Completo

```typescript
import { StageDropdown, STAGES_BY_GROUP } from '@/components/StatusDropdown';

export function MinhaLista() {
  const [items, setItems] = useState([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStageChange = async (itemId: string, newStage: string) => {
    setLoadingId(itemId);
    try {
      await api.updateItem(itemId, { stage: newStage });
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, stage: newStage } : i
      ));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800 rounded">
          <span>{item.name}</span>
          
          <StageDropdown
            group="pedidos"
            currentStage={item.stage}
            onStageChange={(stage) => handleStageChange(item.id, stage)}
            size="sm"
            disabled={loadingId === item.id}
            isSaving={loadingId === item.id}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Checklist de Integração

Para integrar o novo sistema no seu módulo:

- [ ] Importar `StageDropdown` e `STAGES_BY_GROUP`
- [ ] Remover dropdown antigo (se houver)
- [ ] Substituir pelo novo `<StageDropdown />`
- [ ] Testar no mobile (responsividade)
- [ ] Testar no desktop (posicionamento)
- [ ] Testar alteração de etapa (callback)
- [ ] Confirmar que atualiza em tempo real
- [ ] Remover código duplicado

---

## Benefícios

✅ **Uma única lógica** — sem duplicação  
✅ **Atualização centralizada** — muda aqui, funciona lá  
✅ **Componente reutilizável** — mesmo visual em tudo  
✅ **Responsivo** — mobile e desktop perfeitos  
✅ **Tipo-seguro** — TypeScript com tipos corretos  
✅ **Acessível** — keyboard navigation, ARIA labels  
✅ **Performance** — sem re-renders desnecessários  

---

## 📞 Dúvidas?

Veja os arquivos:
- `src/components/StatusDropdown/StageConfig.ts` — Etapas
- `src/components/StatusDropdown/StageDropdown.tsx` — Componente
- `src/components/StatusDropdown/index.ts` — Exportações

