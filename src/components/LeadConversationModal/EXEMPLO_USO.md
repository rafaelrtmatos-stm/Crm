# LeadConversationModal - Exemplo de Uso

## Tela Cheia no Mobile

Quando o usuário clica em uma conversa do funil, abre em tela cheia (mobile):

```typescript
import { LeadConversationModal } from '@/components/LeadConversationModal';

function FunnelView() {
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    <>
      {/* Lista de Leads (lado esquerdo no desktop, ocultada no mobile) */}
      <div className="hidden md:block">
        {leads.map(lead => (
          <button key={lead.id} onClick={() => setSelectedLead(lead)}>
            {lead.name}
          </button>
        ))}
      </div>

      {/* Modal/Tela de Conversa (fullscreen no mobile, lado direito no desktop) */}
      <LeadConversationModal
        lead={selectedLead}
        funnelGroup="pedidos"
        onClose={() => setSelectedLead(null)}
        onStageChange={async (leadId, newStage) => {
          // Atualizar etapa no banco
          await updateLeadStage(leadId, newStage);
        }}
      >
        {/* Conteúdo customizado por aba */}
        {/* Será renderizado dentro do componente */}
      </LeadConversationModal>
    </>
  );
}
```

## Estrutura Visual

### Mobile (Print 1 - Conversa)

```
┌─────────────────────────┐
│ ◄ Elias Junior          │  ← Header com nome
├─────────────────────────┤
│ COMPRAR | PRIMEIRO C. ▼ │  ← Funil + Dropdown etapas
├─────────────────────────┤
│ 💬 Notas Tarefas Salvas │  ← Abas (scroll horizontal)
├─────────────────────────┤
│                         │
│  Conteúdo da aba       │  ← Scroll vertical
│  (Chat, Notas, etc)     │
│                         │
├─────────────────────────┤
│ [Escrever...]   [send]  │  ← Input fixo
└─────────────────────────┘
```

### Desktop (Layout Dividido)

```
┌─────────────────┬──────────────────────┐
│ Elias Junior    │ COMPRAR|PRIMEIRO C.▼ │
├─────────────────┼──────────────────────┤
│ • Lead 1        │ 💬 Notas Tarefas...  │
│ • Lead 2        ├──────────────────────┤
│ • Lead 3        │ Conteúdo da aba      │
│                 │ (scrollável)         │
│                 ├──────────────────────┤
│                 │ [Escrever...]  [👉]  │
└─────────────────┴──────────────────────┘
```

## Dropdown de Etapas (Print 2)

Ao clicar no dropdown, mostra as etapas do funil:

```typescript
// Usa o StageDropdown reutilizável
<StageDropdown
  group="pedidos"
  currentStage={lead.currentStage}
  onStageChange={handleStageChange}
  size="md"
  isSaving={isSaving}
/>

// Resultado: dropdown com todas as etapas + transições
```

## Abas (Print 3)

As abas mostram diferentes seções:

```typescript
// Abas disponíveis
const tabs = [
  'chat'   → Chat com cliente (mensagens)
  'notes'  → Notas/Recados sobre o lead
  'tasks'  → Tarefas pendentes
  'saved'  → Mensagens salvas (templates)
  'sales'  → Informações de venda/orçamento
]

// Trocar de aba: onClick={() => setActiveTab('notes')}
```

## Props

```typescript
interface LeadConversationModalProps {
  // Lead selecionado (null = não exibir modal)
  lead: Lead | null;

  // Grupo de etapas do funil
  funnelGroup: 'pedidos' | 'orcamentos' | 'contratos';

  // Callback ao clicar voltar (mobile)
  onClose: () => void;

  // Callback ao alterar etapa
  onStageChange: (leadId: string, newStage: StageName) => Promise<void>;

  // Conteúdo customizado (opcional)
  children?: React.ReactNode;
}
```

## Integrações

### Com Chat Existente

```typescript
// Passar o componente ChatPanel existente como children
<LeadConversationModal
  lead={selectedLead}
  funnelGroup="pedidos"
  onClose={() => setSelectedLead(null)}
  onStageChange={handleStageChange}
>
  <ChatPanel lead={selectedLead} />
</LeadConversationModal>
```

### Com Notas/Tarefas Existentes

```typescript
// Renderizar baseado na aba ativa
{activeTab === 'notes' && <NotasView leadId={lead.id} />}
{activeTab === 'tasks' && <TarefasView leadId={lead.id} />}
{activeTab === 'sales' && <VendasView leadId={lead.id} />}
```

## Responsividade

### Mobile (< 768px)

- ✅ Fullscreen
- ✅ Some a navbar
- ✅ Header com nome do lead
- ✅ Botão voltar
- ✅ Abas scrolláveis horizontalmente
- ✅ Input fixo no rodapé

### Desktop (≥ 768px)

- ✅ Componente estático (não modal)
- ✅ Lado a lado com lista de leads
- ✅ Mantém navbar visível
- ✅ Mesma estrutura, visual adaptado

## Tailwind Classes Utilizadas

```css
/* Mobile Fullscreen */
fixed inset-0 bg-slate-900 z-50 flex flex-col

/* Desktop - Estático */
md:static md:bg-transparent md:z-auto

/* Header */
flex-shrink-0  → Não encolhe (fixed height)

/* Abas */
overflow-x-auto  → Scroll horizontal
flex-shrink-0    → Abas fixas

/* Conteúdo */
flex-1 overflow-y-auto  → Scroll vertical, cresce dinamicamente

/* Input */
flex-shrink-0  → Fica sempre visível (fixed height)
```

## Exemplo Completo de Uso

```typescript
import { useState } from 'react';
import { LeadConversationModal } from '@/components/LeadConversationModal';
import type { StageName } from '@/components/StatusDropdown';

interface Lead {
  id: string;
  name: string;
  status: string;
  funnelName: string;
  currentStage: StageName;
}

function FunnelPage() {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      name: 'Elias Junior',
      status: 'active',
      funnelName: 'COMPRAR',
      currentStage: 'pedido_recebido',
    },
  ]);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleStageChange = async (leadId: string, newStage: StageName) => {
    // Atualizar no banco
    console.log(`Atualizando lead ${leadId} para ${newStage}`);
    
    // Atualizar state local
    setLeads(prev =>
      prev.map(lead =>
        lead.id === leadId ? { ...lead, currentStage: newStage } : lead
      )
    );
  };

  return (
    <div className="flex gap-4 h-screen">
      {/* Lista de Leads (Desktop) */}
      <div className="hidden md:flex flex-col w-64 bg-slate-800 p-4">
        {leads.map(lead => (
          <button
            key={lead.id}
            onClick={() => setSelectedLead(lead)}
            className={`p-3 rounded text-left ${
              selectedLead?.id === lead.id
                ? 'bg-primary-500/30 text-primary-400'
                : 'hover:bg-white/10 text-white'
            }`}
          >
            <p className="font-bold text-sm">{lead.name}</p>
            <p className="text-xs text-white/60">{lead.status}</p>
          </button>
        ))}
      </div>

      {/* Conversa */}
      <LeadConversationModal
        lead={selectedLead}
        funnelGroup="pedidos"
        onClose={() => setSelectedLead(null)}
        onStageChange={handleStageChange}
      />
    </div>
  );
}

export default FunnelPage;
```

## Dúvidas?

Veja o componente em:
`src/components/LeadConversationModal/LeadConversationModal.tsx`

