# 🚀 MIGRAÇÕES NO SUPABASE - COMO EXECUTAR

## Status: PRONTO PARA EXECUTAR

Três migrations foram criadas em `supabase/`:

1. **add_service_status_orcamentos_contratos.sql** ✅ EXECUTE PRIMEIRO (adiciona colunas)
2. **sync_old_status_to_service_status.sql** ✅ EXECUTE SEGUNDO (migra dados antigos)
3. **remove_old_status_columns.sql** ⚠️ EXECUTE DEPOIS DE TESTAR (remove antigos)

---

## PASSO 1: Adicionar service_status (NÃO DESTRUTIVO)

### ✅ Seguro executar agora
- Adiciona nova coluna `service_status`
- Cria índices para performance
- Adiciona constraints para validação
- Não remove nada

### Como executar:
1. Abra o Supabase
2. Vá para SQL Editor
3. Cole o conteúdo de `supabase/add_service_status_orcamentos_contratos.sql`
4. Clique "RUN"
5. Aguarde mensagem de sucesso

### Resultado esperado:
```
✅ ALTER TABLE orcamentos
✅ ALTER TABLE contratos
✅ Índices criados
✅ Constraints adicionadas
✅ Reload schema notificado
```

---

## PASSO 2: Sincronizar Dados Antigos (SEGURO)

### ✅ Seguro executar agora (depois da migration 1)
- Copia dados do `status` antigo para `service_status` novo
- Usa mapeamento inteligente:
  - 'em_espera' → 'pedido_recebido'
  - 'aprovada' → 'aguardando_aprovacao'
  - 'em_producao' → 'producao'
  - 'concluido' → 'produto_entregue'
  - etc...
- Não remove nada
- Pode re-rodar sem problemas

### Como executar:
1. Aguarde sucesso da migration 1
2. Abra o Supabase → SQL Editor
3. Cole o conteúdo de `supabase/sync_old_status_to_service_status.sql`
4. Clique "RUN"
5. Veja o relatório de quantos registros foram migrados

### Resultado esperado:
```
tabela       | total_registros | migrados
-------------|-----------------|----------
orcamentos   | 45              | 38
contratos    | 12              | 11
```

Isso significa que 38 orçamentos e 11 contratos tiveram seu status antigo
mapeado para o novo service_status!

---

## PASSO 3: Testar no Código (1-2 dias)

Depois que as migrations 1 e 2 rodarem:

1. Deploy o código atualizado (com service_status)
2. Teste em STAGING/DEV:
   - Criar novo Orçamento → deve ter service_status = 'pedido_recebido'
   - Criar novo Contrato → deve ter service_status = 'pedido_recebido'
   - Mudar etapa → deve sincronizar entre Pedido ↔ Orçamento ↔ Contrato
   - Editar Orçamento → dropdown de etapas deve mostrar as 8 opções

3. Se houver bugs:
   - Fixe o código
   - Deploy novamente
   - Não execute a migration 2 ainda

4. Quando estiver 100% OK → vá pro Passo 3

---

## PASSO 3: Remover Colunas Antigas (DESTRUTIVO)

### ⚠️ Cuidado! Isto é irreversível

Execute APENAS depois de confirmar que TUDO funciona com service_status.

### Antes de executar:
1. **Faça backup**: Exporte os dados da tabela `orcamentos` e `contratos`
2. **Teste em produção** com pelo menos 1 dia de uso real
3. **Confirme** que nenhum código ainda referencia o campo `status` antigo

### Como executar:
1. Abra o Supabase
2. Vá para SQL Editor
3. Cole o conteúdo de `supabase/remove_old_status_columns.sql`
4. Clique "RUN"
5. Aguarde sucesso (cria backups automaticamente)

### O que acontece:
```
✅ Tabelas de backup criadas:
   - orcamentos_old_status_backup
   - contratos_old_status_backup

✅ Constraints removidas

⚠️  Coluna status AINDA EXISTE (por segurança, removido manualmente)
```

### Remover coluna manualmente:
Depois de confirmar que o backup foi criado, execute no SQL Editor:

```sql
-- Remove de verdade (IRREVERSÍVEL)
ALTER TABLE orcamentos DROP COLUMN status;
ALTER TABLE contratos DROP COLUMN status;

NOTIFY pgrst, 'reload schema';
```

---

## 📊 Resultado Final

### Antes das migrações:
```
orcamentos:
├─ status: 'em_espera' | 'aprovada' | 'em_producao' | 'recusada' | 'concluido'
└─ (sem ligação com o Pedido)

contratos:
├─ status: 'aguardando_assinatura_cliente' | 'assinado' | 'em_execucao' | etc
└─ (sem ligação com o Pedido)
```

### Depois das migrações:
```
orcamentos:
├─ service_status: 'pedido_recebido' | 'aguardando_arte' | ... (8 etapas)
├─ venda_id: FK → vendas
└─ Sincronizado com Pedido!

contratos:
├─ service_status: 'pedido_recebido' | 'aguardando_arte' | ... (8 etapas)
├─ venda_id: FK → vendas
└─ Sincronizado com Pedido!

vendas (Pedido):
└─ service_status: (fonte de verdade)
```

---

## ✅ Checklist Antes de Cada Migration

### Antes de executar Migration 1 (Adicionar colunas):
- [ ] Backup dos dados (recomendado, mas não obrigatório)
- [ ] Comunicou ao time que vai rodar migration
- [ ] Horário de baixo uso do sistema

### Antes de executar Migration 2 (Sincronizar dados):
- [ ] ✅ Migration 1 executada com sucesso
- [ ] ✅ Verificou que service_status foi adicionado
- [ ] ✅ Nenhum erro no Supabase

### Antes de executar Migration 3 (Remover antigos):
- [ ] ✅ Migrations 1 e 2 executadas com sucesso
- [ ] ✅ Código deployd com service_status
- [ ] ✅ 1+ dias de testes em produção
- [ ] ✅ Nenhum erro com o novo sistema
- [ ] ✅ Backup das tabelas completo
- [ ] ✅ Comunicou ao time

---

## 🆘 Se der Erro

Se a migration 1 falhar:
- Leia a mensagem de erro
- Pode re-rodar (é idempotente com IF NOT EXISTS)
- Não avance pra migration 2

Se a migration 2 falhar:
- Tenha mantido o backup (orcamentos_old_status_backup)
- Restaure os dados se necessário
- Não execute o DROP COLUMN ainda

---

## 📞 Dúvidas?

Veja os arquivos SQL:
- `supabase/add_service_status_orcamentos_contratos.sql` (Passo 1)
- `supabase/sync_old_status_to_service_status.sql` (Passo 2)
- `supabase/remove_old_status_columns.sql` (Passo 3)

Ou verifique no Supabase:
- SQL Editor → histórico de execuções
- Migrations → lista de migrações
