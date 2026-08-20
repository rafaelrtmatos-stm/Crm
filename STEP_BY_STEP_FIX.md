# Step-by-Step: Corrigir Erro 400 em 5 Minutos

## 🎯 Resumo Rápido

Você tem **1 coluna faltante** (`waiting_since`) + **1 código bugado** (hardcoded `'rafa-arts'`). Foram criados 4 arquivos com a solução. Siga estes passos:

1. **SQL** — Adicionar colunas faltantes (1 min)
2. **JavaScript** — Corrigir a query hardcoded (2 min)
3. **Validar** — Confirmar que o erro sumiu (1 min)

---

## 📋 Passo 1: Executar o SQL

### 1.1 Abra o Supabase

1. Vá para https://supabase.co
2. Selecione o projeto `areqouezrbdubfutjzki`
3. No menu esquerdo, clique em **SQL Editor**
4. Clique em **New Query**

### 1.2 Cole o SQL

Abra o arquivo `supabase/fix_leads_missing_columns.sql` no seu repositório local e **copie todo o conteúdo**:

```sql
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_message_direction TEXT,
ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_transcribe BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unread BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

NOTIFY pgrst, 'reload schema';
```

Cole no editor do Supabase.

### 1.3 Execute

- Pressione **Ctrl+Enter** (ou clique no botão ▶ "Run")
- Aguarde a mensagem: ✅ **"Query executed successfully"**
- Se aparecer erro, copie e cole em uma conversa para debug

### ✅ Confirmação

Rode esta query simples para confirmar que a coluna foi adicionada:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY column_name;
```

Se `waiting_since` aparecer na lista, está feito! ✅

---

## 🔧 Passo 2: Corrigir o Código React

### 2.1 Abra src/App.tsx

No seu editor (VS Code, WebStorm, etc.), abra `src/App.tsx` e navegue até **linha 641-653**.

### 2.2 Encontre este trecho:

```typescript
// ❌ ANTES (linhas 641-653)
useEffect(() => {
  if (!currentCompany) {
    setUnrepliedLeadsCount(0);
    return;
  }
  const loadCount = async () => {
    const { data } = await supabase.from('leads').select('waiting_since').eq('company_id', 'rafa-arts');
    setUnrepliedLeadsCount((data || []).filter((r: any) => r.waiting_since !== null && r.waiting_since !== undefined).length);
  };
  loadCount();
  const channel = supabase.channel('app-unreplied-count').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${currentCompany.id}` }, loadCount).subscribe();
  return () => { supabase.removeChannel(channel); };
}, [currentCompany]);
```

### 2.3 Substitua pelo código corrigido:

Abra o arquivo `APP_TSX_FIX_LINE_647.tsx` (criado anteriormente) e **copie todo o código do useEffect**.

Cole no seu `src/App.tsx`, **substituindo todo o useEffect das linhas 641-653**.

### ✅ Confirmação Visual

Após colar, você deve ter:

```typescript
// ✅ DEPOIS (corrigido)
useEffect(() => {
  if (!currentCompany) {
    setUnrepliedLeadsCount(0);
    return;
  }

  const loadCount = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('waiting_since')
        .eq('company_id', currentCompany.id);  // ✅ Dinâmico!

      if (error) {
        console.error('❌ Erro ao carregar leads não respondidos:', error);
        setUnrepliedLeadsCount(0);
        return;
      }
      // ... resto do código
    } catch (err) {
      console.error('❌ Erro ao carregar leads não respondidos:', err);
      setUnrepliedLeadsCount(0);
    }
  };
  // ... resto
}, [currentCompany]);
```

A mudança principal: **`'rafa-arts'` virou `currentCompany.id`** ✅

---

## 📊 Passo 3 (Opcional): Corrigir as Outras 9+ Linhas

Se quiser ser completo, corrija também as outras queries hardcoded. Veja o arquivo:

**`ALL_HARDCODED_COMPANY_ID_FIXES.md`**

Este arquivo detalha cada linha (439, 473, 495, 543, 556, 558, 661, 664, 666) que usa `'rafa-arts'` hardcoded.

**Recomendação:** Faça isso em um commit separado, após validar que o erro 400 sumiu.

---

## 🧪 Passo 4: Validar

### 4.1 Salve o arquivo e recarregue o app

```bash
# Se está rodando com npm/yarn
npm start
# ou
yarn dev
```

Aguarde o rebuild (uns 10-15s).

### 4.2 Abra o navegador

1. Vá para http://localhost:5173 (ou a URL local da sua app)
2. Abra o **DevTools** (F12)
3. Clique na aba **Console** (ou **Network** se quiser ver as requisições)

### 4.3 Procure pelo erro

**Cenário 1 — Se o erro 400 sumiu:**
- Ótimo! O SQL foi executado corretamente.
- A contagem de "leads não respondidos" deve aparecer no seu navbar/sidebar.
- Mude de empresa (se houver múltiplas) — a contagem deve atualizar corretamente.

**Cenário 2 — Se ainda aparecer erro 400:**
- Significa que o SQL **não foi executado** ou **foi executado no projeto errado**.
- Volta ao Passo 1 e confirma que:
  1. Você está no Supabase do projeto correto (`areqouezrbdubfutjzki`)
  2. A query rodou sem erro ("Query executed successfully")
  3. A coluna realmente existe (rode o SELECT para confirmar)
  4. Se depois de confirmar ainda der erro, tira print e compartilha o erro do Supabase

### 4.4 Confirmar no Console

Cole isso no Console do navegador (DevTools) para monitorar requisições:

```javascript
// Intercepta requisições ao Supabase
const originalFetch = fetch;
window.fetch = function(...args) {
  const [url] = args;
  if (url.includes('supabase.co') && url.includes('/rest/')) {
    console.log('📡 Supabase:', url);
  }
  return originalFetch.apply(this, args).then(res => {
    if (url.includes('waiting_since') && res.status === 400) {
      console.error('🔴 ERRO 400 AINDA EXISTE:', url);
    }
    if (url.includes('waiting_since') && res.status === 200) {
      console.log('✅ SUCESSO! waiting_since respondeu 200');
    }
    return res;
  });
};
```

Se aparecer **✅ SUCESSO!**, está tudo certo!

---

## 📝 Checklist Final

- [ ] SQL executado no Supabase (Query executed successfully)
- [ ] Coluna `waiting_since` confirmada com SELECT
- [ ] Código React atualizado (linha 647: `currentCompany.id`)
- [ ] App recarregado (npm start)
- [ ] Sem erro 400 no Console ✅
- [ ] Contagem de leads não respondidos aparecendo
- [ ] Testado: mudou de empresa? Contagem atualiza? ✅

---

## 🆘 Se Algo Deu Errado

### Erro: "Query executed successfully" mas erro 400 persiste

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página (Ctrl+F5)
3. Aguarde 10s (às vezes o PostgREST demora pra recarregar)

### Erro: "Column 'waiting_since' doesn't exist" no Supabase

**Solução:**
1. Confirme que você está no projeto correto (`areqouezrbdubfutjzki`)
2. Rode manualmente no SQL Editor:
   ```sql
   ALTER TABLE leads ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMPTZ;
   NOTIFY pgrst, 'reload schema';
   ```

### Erro: App não carrega após mudança no código

**Solução:**
1. Verifique se não há erro de syntax no `src/App.tsx` (TypeScript deve acusar)
2. Desfaça a mudança e tente novamente
3. Copie o código do arquivo `APP_TSX_FIX_LINE_647.tsx` com mais cuidado

---

## 📚 Arquivos de Referência

| Arquivo | Propósito |
|---------|-----------|
| `supabase/fix_leads_missing_columns.sql` | SQL para adicionar 6 colunas faltantes |
| `FIX_WAITING_SINCE_ERROR_400.md` | Diagnóstico detalhado + explicação |
| `APP_TSX_FIX_LINE_647.tsx` | Código React corrigido (pronto para copiar/colar) |
| `ALL_HARDCODED_COMPANY_ID_FIXES.md` | Todas as outras 9+ correções de hardcoded |
| `STEP_BY_STEP_FIX.md` | Este arquivo — passo-a-passo visual |

---

## ⏱️ Tempo Total Estimado

- **SQL:** 1 min
- **Código React:** 2 min
- **Teste/Validação:** 1 min
- **Outras correções (opcional):** 5-10 min

**Total:** 5 minutos (+ 5-10 se fizer todas as correções)

---

## 🎉 Próximos Passos

Depois de corrigir:

1. ✅ Commita a mudança:
   ```bash
   git add src/App.tsx supabase/fix_leads_missing_columns.sql
   git commit -m "fix: corrigir erro 400 em waiting_since + hardcoded company_id"
   ```

2. ✅ (Opcional) Corrija as outras 9+ linhas com hardcoded `'rafa-arts'`

3. ✅ (Opcional) Implemente melhor tratamento de erro em outras queries

---

## 📞 Resumo de Contato

Se precisar, os arquivos criados estão todos em `/supabase/` e `/` do repositório. Eles servem como referência para:
- Entender o que deu errado
- Executar o SQL
- Corrigir o código
- Fazer testes

Bom luck! 🚀

