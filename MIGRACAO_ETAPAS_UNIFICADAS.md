# Migração: Sistema Unificado de Etapas (Pedido ↔ Orçamento ↔ Contrato)

## Objetivo
Unificar o sistema de etapas entre Pedido, Orçamento e Contrato.

## Mudanças no Banco (Supabase)

### Tabela `orcamentos`
- ❌ REMOVER: coluna `status` (em_espera, aprovada, em_producao, recusada, concluido)
- ✅ ADICIONAR: coluna `service_status` (mesmo das 8 etapas do Serviço)
- DEFAULT: 'pedido_recebido'

```sql
ALTER TABLE orcamentos 
  DROP COLUMN IF EXISTS status,
  ADD COLUMN IF NOT EXISTS service_status varchar DEFAULT 'pedido_recebido';
```

### Tabela `contratos`
- ❌ REMOVER: coluna `status` (aguardando_assinatura_cliente, assinado, em_execucao, concluido, encerrado, cancelado)
- ✅ ADICIONAR: coluna `service_status` (mesmo das 8 etapas do Serviço)
- DEFAULT: 'pedido_recebido'

```sql
ALTER TABLE contratos 
  DROP COLUMN IF EXISTS status,
  ADD COLUMN IF NOT EXISTS service_status varchar DEFAULT 'pedido_recebido';
```

### Tabela `vendas` (Pedido)
- ✅ Já tem `service_status` (não mexer)

## Mudanças no Código

### 1. Remover constantes antigas
- ❌ `ORCAMENTO_CONTRATO_STAGES`
- ❌ `ORCAMENTO_CONTRATO_LABELS`

### 2. Usar apenas
- ✅ `STAGE_ORDER` (8 etapas)
- ✅ `STAGE_LABELS` (nomes das 8 etapas)

### 3. Sincronização
Quando Pedido muda de etapa → atualiza Orçamento e Contrato
Quando Orçamento muda de etapa → atualiza Pedido e Contrato (e vice-versa)

## Status Novo do Pedido
- pedido_recebido
- aguardando_arte
- arte_em_desenvolvimento
- aguardando_aprovacao
- producao
- acabamento
- aguardando_retirada
- produto_entregue
