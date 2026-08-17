# ⚡ QUICK START - EXECUTAR MIGRATIONS AGORA

## TL;DR (Resumo Executivo)

```
AGORA:         Execute migração 1 + 2 no Supabase
DEPOIS (1-2d): Execute migração 3 depois de testar tudo
```

---

## 🔧 Como Executar (3 cliques)

### Migration 1: Adicionar Colunas
1. Abra https://supabase.com/dashboard
2. Vá para SQL Editor
3. **Cole isto:**
```sql
-- Copie o conteúdo de supabase/add_service_status_orcamentos_contratos.sql
-- Cole aqui no SQL Editor
```
4. Clique **RUN**
5. ✅ Espere "Query executed successfully"

### Migration 2: Sincronizar Dados
1. Vá para SQL Editor (novamente)
2. **Cole isto:**
```sql
-- Copie o conteúdo de supabase/sync_old_status_to_service_status.sql
-- Cole aqui no SQL Editor
```
3. Clique **RUN**
4. ✅ Espere "Query executed successfully"
5. 📊 Veja o relatório de migração (quantos registros foram atualizados)

### Migration 3: Remover Antigos ⚠️
**DEPOIS de 1-2 dias testando:**
1. Vá para SQL Editor
2. **Cole isto:**
```sql
-- Copie o conteúdo de supabase/remove_old_status_columns.sql
-- Cole aqui no SQL Editor
```
3. Clique **RUN**
4. ✅ Espere "Query executed successfully"

---

## 📊 O que Esperar

### Depois de Migration 1:
```
✅ Tabelas atualizadas
✅ Índices criados
✅ Constraints adicionadas
⏳ Pronto pra sincronizar
```

### Depois de Migration 2:
```
✅ Dados sincronizados
📊 Relatório:
   - orcamentos: X registros
   - contratos: Y registros
✅ Status antigos mapeados pra novas etapas
```

### Depois de Migration 3:
```
✅ Backups criados (segurança)
✅ Constraints removidas
⚠️ Colunas status AINDA EXISTEM (remover manualmente depois se desejar)
```

---

## ✅ Verificação Rápida

Depois que rodar migration 1 + 2, vire no SQL Editor:

```sql
-- Verificar orcamentos
SELECT COUNT(*) as total_orcamentos, 
       COUNT(service_status) as com_novo_status
FROM orcamentos;

-- Verificar contratos
SELECT COUNT(*) as total_contratos, 
       COUNT(service_status) as com_novo_status
FROM contratos;
```

Você deve ver:
```
total_orcamentos | com_novo_status
-----------------|----------------
       45        |       45

total_contratos | com_novo_status
--------|-----
   12   |   12
```

---

## ⚠️ IMPORTANTE

- ✅ Migrations 1 e 2 = seguras, execute agora
- ⏳ Migration 3 = aguarde 1-2 dias depois
- 📱 Código já está pronto (deploy junto ou antes)
- 💾 Backups são criados automaticamente
- 🔄 Pode re-rodar migrations (são idempotentes)

---

## 🚀 Deploy de Código

O código já está updated no `main`:
```bash
git pull origin main
npm run build
npm start
```

Isso usa `service_status` automaticamente!

---

## 📞 Se der Erro

1. **Migration 1 falha?** → Re-roda. É seguro.
2. **Migration 2 falha?** → Vê a mensagem. Provavelmente migração 1 não rodou.
3. **Migration 3 falha?** → Tenha mantido backup (orcamentos_old_status_backup).

---

## 📚 Documentação Completa

- 📋 `MIGRACAO_EXECUTAR.md` — guia passo a passo
- 📊 `RESUMO_MIGRATIONS.txt` — visual overview
- 📂 `supabase/*.sql` — scripts SQL brutos

---

## 🎯 Resultado Final

**Pedido ↔ Orçamento ↔ Contrato** — tudo sincronizado com as mesmas 8 etapas!

```
1. pedido_recebido
2. aguardando_arte
3. arte_em_desenvolvimento
4. aguardando_aprovacao
5. producao
6. acabamento
7. aguardando_retirada
8. produto_entregue
```

✅ **PRONTO PARA EXECUTAR!**

