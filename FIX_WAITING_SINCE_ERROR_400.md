# FIX: Erro 400 na query de `waiting_since` — Supabase leads table

## 🔴 O Problema

**Erro no console:**
```
areqouezrbdubfutjzki.supabase.co/rest/v1/leads?select=waiting_since&company_id=eq.rafa-arts:1
Failed to load resource: the server responded with a status of 400 ()
```

**Causa raiz:** A tabela `leads` foi criada com um schema incompleto. A coluna `waiting_since` não existe no banco de dados.

---

## 📋 Diagnóstico Completo

### 1️⃣ Coluna `waiting_since` não existe
- A migration `migrate_firestore_fase1_funil_mensagens.sql` **define** a coluna `waiting_since` (linha 58)
- Mas essa migration **nunca foi executada** no seu Supabase (ou foi executada com uma versão antiga que não incluía essa coluna)
- Resultado: PostgREST retorna **400 Bad Request** ao tentar fazer `select=waiting_since`

**Confirmação no banco:**
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'leads';
```
Se `waiting_since` não aparecer na lista, é isso.

### 2️⃣ `company_id` hardcoded como 'rafa-arts' (bug silencioso)
No arquivo `src/App.tsx`, existem **10+ queries** com `company_id` hardcoded:

```typescript
// ❌ ERRADO (linha 647)
const { data } = await supabase.from('leads')
  .select('waiting_since')
  .eq('company_id', 'rafa-arts');  // <— Hardcoded!

// ✅ CORRETO (linha 651, no realtime)
const channel = supabase.channel('app-unreplied-count')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'leads', 
    filter: `company_id=eq.${currentCompany.id}`  // <— Dinâmico!
  })
```

Se o usuário mudar de empresa, a linha 647 **continua consultando 'rafa-arts'**, não a empresa atual.

---

## ✅ Como Corrigir

### Passo 1: Adicionar as colunas faltantes no Supabase

1. Abra o **SQL Editor** do Supabase (projeto `areqouezrbdubfutjzki`)
2. Cole e execute **TODO** o conteúdo de `supabase/fix_leads_missing_columns.sql`:

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

3. Aguarde a confirmação "Query executed successfully"
4. **Pronto!** A coluna `waiting_since` agora existe

---

### Passo 2: Corrigir o código React (App.tsx)

Substitua as 10 queries com `'rafa-arts'` hardcoded pela versão dinâmica usando `currentCompany.id`.

#### ❌ Antes (linhas problemáticas):

```typescript
// Linha 439
const { data } = await supabase
  .from('configuracoes')
  .select('logo_light_url, logo_dark_url')
  .eq('company_id', 'rafa-arts')  // ❌ Hardcoded
  .maybeSingle();

// Linha 473
supabase.from('configuracoes')
  .select('menu_config')
  .eq('company_id', 'rafa-arts')  // ❌ Hardcoded
  .maybeSingle()...

// Linha 647 (🔴 CAUSA DO ERRO 400)
const { data } = await supabase
  .from('leads')
  .select('waiting_since')
  .eq('company_id', 'rafa-arts');  // ❌ Hardcoded + sem tratamento de erro

// ... e mais 7 linhas similares
```

#### ✅ Depois (versão corrigida):

A estratégia é simples: **usar `currentCompany.id` em vez de `'rafa-arts'`**.

**Algumas queries rodam no `useEffect` de inicialização (sem `currentCompany` ainda):**
- Linha 439 (logos) — Rodas apenas uma vez, hardcoded é aceitável **OU** pode deixar como está se for um config global

**Outras rodam dentro de métodos que já checam `if (!currentCompany)`:**
- Linha 647 (waiting_since) — Já tem o check `if (!currentCompany) return;` antes
- Linhas 661, 664, 666 (processIncomingMessage) — Rodadas quando há mensagens (usuário logado)

---

## 📝 Mapa Completo de Mudanças

| Linha | Query | Antes | Depois | Observação |
|-------|-------|-------|--------|------------|
| 439 | `configuracoes` (logos) | `'rafa-arts'` | `currentCompany.id` ou deixar hardcoded se for config global | Logo é por empresa |
| 473 | `configuracoes` (menu) | `'rafa-arts'` | Adicionar dependência `[currentCompany]` | Menu muda por empresa |
| 495 | `configuracoes` (caixa) | `'rafa-arts'` | `currentCompany.id` | Caixa é por empresa |
| 543 | `leads` (list for webhook) | `'rafa-arts'` | `currentCompany.id` | Leads são por empresa |
| 556, 558, 664, 666 | `funnels` (default/list) | `'rafa-arts'` | `currentCompany.id` | Funis são por empresa |
| **647** | **`leads` (waiting_since)** | **`'rafa-arts'`** | **`currentCompany.id`** | **🔴 PRINCIPAL — causa do erro 400** |
| 661 | `leads` (by phone) | `'rafa-arts'` | `currentCompany.id` | Leads são por empresa |

---

## 🔧 Exemplo de Correção (Linha 647)

### Antes:
```typescript
useEffect(() => {
  if (!currentCompany) {
    setUnrepliedLeadsCount(0);
    return;
  }
  const loadCount = async () => {
    const { data } = await supabase
      .from('leads')
      .select('waiting_since')
      .eq('company_id', 'rafa-arts');  // ❌ Ignora currentCompany

    setUnrepliedLeadsCount(
      (data || []).filter((r: any) => 
        r.waiting_since !== null && r.waiting_since !== undefined
      ).length
    );
  };
  loadCount();
  const channel = supabase
    .channel('app-unreplied-count')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'leads', 
      filter: `company_id=eq.${currentCompany.id}`  // ✅ Correto aqui!
    }, loadCount)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [currentCompany]);
```

### Depois:
```typescript
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

      setUnrepliedLeadsCount(
        (data || []).filter((r: any) => 
          r.waiting_since !== null && r.waiting_since !== undefined
        ).length
      );
    } catch (err) {
      console.error('❌ Erro ao carregar leads não respondidos:', err);
      setUnrepliedLeadsCount(0);
    }
  };
  loadCount();
  const channel = supabase
    .channel('app-unreplied-count')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'leads', 
      filter: `company_id=eq.${currentCompany.id}`
    }, loadCount)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [currentCompany]);
```

**Mudanças principais:**
1. `'rafa-arts'` → `currentCompany.id`
2. Adicionado `try/catch` e verificação de `error`
3. Log claro de erros (em vez de falhar silenciosamente)

---

## 📋 Checklist de Correção

- [ ] **SQL executado:** Rodei `fix_leads_missing_columns.sql` no SQL Editor do Supabase
- [ ] **Confirmação:** Verifiquei que `waiting_since` aparece em `information_schema.columns`
- [ ] **Linha 647:** Mudei `.eq('company_id', 'rafa-arts')` para `.eq('company_id', currentCompany.id)`
- [ ] **Tratamento de erro:** Adicionei `try/catch` e verificação de `error`
- [ ] **Outras queries:** Verifiquei as outras 9+ linhas com hardcoded `'rafa-arts'`
- [ ] **Reload:** Recarreguei o app — erro 400 sumiu! ✅

---

## 🧪 Teste Final

1. Abra o Console do navegador (F12 → Aba "Console")
2. Mude de empresa (se houver múltiplas)
3. Verifique que:
   - ❌ Não há mais erro 400 na requisição `GET /rest/v1/leads?select=waiting_since...`
   - ✅ A contagem de leads não respondidos aparece correta
   - ✅ Se houver logs de erro, devem ser claros e legíveis (não silenciosos)

---

## 📚 Referência

- **Arquivo de migration:** `supabase/migrate_firestore_fase1_funil_mensagens.sql` (define a tabela + colunas)
- **Arquivo de fix SQL:** `supabase/fix_leads_missing_columns.sql` (adiciona colunas faltantes)
- **Código afetado:** `src/App.tsx` (linhas 439, 473, 495, 543, 556, 558, 647, 661, 664, 666)
- **Tipo de erro:** PostgREST 400 Bad Request (coluna inexistente)
- **Padrão do app:** Single-tenant mas com suporte a múltiplas empresas (usar `currentCompany.id`)

