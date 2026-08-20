# Todas as correções: company_id hardcoded como 'rafa-arts'

## 📊 Resumo Executivo

Encontradas **10 linhas** em `src/App.tsx` com `company_id` hardcoded. A maioria rodas em `useEffect` que **já checam** `if (!currentCompany)`, então a correção é simples: trocar `'rafa-arts'` por `currentCompany.id`.

---

## 1️⃣ Linha 439 — Logos (inicialização)

**Contexto:** Carrega logos light/dark da tabela `configuracoes` no componentDidMount.

**Problema:** Rodas sem `currentCompany` estar pronto; sempre busca 'rafa-arts'.

**Solução:** Deixar como está **OU** adicionar dependência `[currentCompany]` para recarregar quando trocar de empresa.

### ❌ Antes:
```typescript
// Linha 435-452
const [logosReady, setLogosReady] = useState(false);
useEffect(() => {
  const loadLogos = async () => {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('logo_light_url, logo_dark_url')
        .eq('company_id', 'rafa-arts')  // ❌ Hardcoded
        .maybeSingle();
      setLogoLightUrl(data?.logo_light_url || null);
      setLogoDarkUrl(data?.logo_dark_url || null);
    } catch (e) { /* mantem logo padrao */ }
    finally { setLogosReady(true); }
  };
  loadLogos();
  const channel = supabase
    .channel('logos-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, loadLogos)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);  // ❌ Nunca recarrega
```

### ✅ Depois (Opção A — sem mudança, hardcoded é ok para logo global):
Se logo é **global** (mesma para todas as empresas):
```typescript
useEffect(() => {
  // ... mantém como está, hardcoded é aceitável
  .eq('company_id', 'rafa-arts')
}, []);
```

### ✅ Depois (Opção B — logo por empresa):
Se logo é **por empresa**:
```typescript
useEffect(() => {
  if (!currentCompany) return;  // Aguarda empresa ser selecionada

  const loadLogos = async () => {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('logo_light_url, logo_dark_url')
        .eq('company_id', currentCompany.id)  // ✅ Dinâmico
        .maybeSingle();
      setLogoLightUrl(data?.logo_light_url || null);
      setLogoDarkUrl(data?.logo_dark_url || null);
    } catch (e) { /* mantem logo padrao */ }
    finally { setLogosReady(true); }
  };
  loadLogos();
  const channel = supabase
    .channel('logos-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, loadLogos)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [currentCompany]);  // ✅ Recarrega quando muda de empresa
```

---

## 2️⃣ Linha 473 — Menu Config (inicialização)

**Contexto:** Carrega configuração de menu da tabela `configuracoes`.

**Problema:** Rodas sem `currentCompany`, sempre busca 'rafa-arts'.

### ❌ Antes:
```typescript
// Linha 471-478
const [menuConfig, setMenuConfig] = useState<{ id: string; visible: boolean }[] | null>(null);
useEffect(() => {
  supabase.from('configuracoes')
    .select('menu_config')
    .eq('company_id', 'rafa-arts')  // ❌ Hardcoded
    .maybeSingle()
    .then(({ data }) => {
      if (data?.menu_config && Array.isArray(data.menu_config) && data.menu_config.length > 0) {
        setMenuConfig(data.menu_config);
      }
    });
}, []);  // ❌ Nunca recarrega
```

### ✅ Depois:
```typescript
useEffect(() => {
  if (!currentCompany) {
    setMenuConfig(null);
    return;
  }

  supabase
    .from('configuracoes')
    .select('menu_config')
    .eq('company_id', currentCompany.id)  // ✅ Dinâmico
    .maybeSingle()
    .then(({ data }) => {
      if (data?.menu_config && Array.isArray(data.menu_config) && data.menu_config.length > 0) {
        setMenuConfig(data.menu_config);
      }
    })
    .catch((err) => console.error('Erro ao carregar menu_config:', err));
}, [currentCompany]);  // ✅ Recarrega quando muda de empresa
```

---

## 3️⃣ Linha 495 — Caixa Aberto (useEffect com currentCompany)

**Contexto:** Verifica se o caixa está aberto na empresa atual.

**Problema:** Query hardcoded em 'rafa-arts' enquanto o useEffect **já** tem dependência em `currentCompany`.

### ❌ Antes:
```typescript
// Linha 490-505 (aprox)
useEffect(() => {
  if (!currentCompany) return;

  const checkCaixa = async () => {
    const { data } = await supabase
      .from('configuracoes')
      .select('caixa_aberto')
      .eq('company_id', 'rafa-arts')  // ❌ Ignora currentCompany!
      .maybeSingle();
    if (data?.caixa_aberto) {
      setIsCaixaAberto(true);
    }
  };
  checkCaixa();
  const channel = supabase
    .channel('caixa-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, checkCaixa)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [currentCompany]);
```

### ✅ Depois:
```typescript
useEffect(() => {
  if (!currentCompany) return;

  const checkCaixa = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('caixa_aberto')
        .eq('company_id', currentCompany.id)  // ✅ Agora dinâmico
        .maybeSingle();
      if (error) {
        console.error('Erro ao verificar caixa:', error);
        return;
      }
      setIsCaixaAberto(data?.caixa_aberto || false);
    } catch (err) {
      console.error('Erro ao verificar caixa:', err);
    }
  };
  checkCaixa();
  const channel = supabase
    .channel('caixa-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, checkCaixa)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [currentCompany]);
```

---

## 4️⃣ Linha 543 — Leads List (webhook processing)

**Contexto:** Carrega lista de leads para processamento de webhook/mensagens.

**Problema:** Hardcoded em 'rafa-arts'.

### ❌ Antes (Linha 543):
```typescript
// Dentro de um useEffect que já checka if (!currentCompany)
const { data: leadsRows } = await supabase
  .from('leads')
  .select('id, phone')
  .eq('company_id', 'rafa-arts')  // ❌ Hardcoded
  .catch(...)
```

### ✅ Depois:
```typescript
const { data: leadsRows, error } = await supabase
  .from('leads')
  .select('id, phone')
  .eq('company_id', currentCompany.id)  // ✅ Dinâmico

if (error) {
  console.error('Erro ao buscar leads:', error);
  return;
}
```

---

## 5️⃣ Linha 556, 558 — Funnels (webhook processing)

**Contexto:** Busca funnel default e fallback da empresa.

**Problema:** Duas queries com 'rafa-arts' hardcoded.

### ❌ Antes (Linhas 556-567):
```typescript
let { data: funnelRows } = await supabase
  .from('funnels')
  .select('id')
  .eq('company_id', 'rafa-arts')  // ❌ Hardcoded
  .eq('is_default', true)
  .limit(1);

if (!funnelRows || funnelRows.length === 0) {
  const { data } = await supabase
    .from('funnels')
    .select('id')
    .eq('company_id', 'rafa-arts')  // ❌ Hardcoded novamente
    .limit(1);
  funnelRows = data;
}
```

### ✅ Depois:
```typescript
let { data: funnelRows, error: err1 } = await supabase
  .from('funnels')
  .select('id')
  .eq('company_id', currentCompany.id)  // ✅ Dinâmico
  .eq('is_default', true)
  .limit(1);

if (err1) {
  console.error('Erro ao buscar funnel default:', err1);
  return;
}

if (!funnelRows || funnelRows.length === 0) {
  const { data, error: err2 } = await supabase
    .from('funnels')
    .select('id')
    .eq('company_id', currentCompany.id)  // ✅ Dinâmico
    .limit(1);
  if (err2) {
    console.error('Erro ao buscar fallback funnel:', err2);
    return;
  }
  funnelRows = data;
}
```

---

## 6️⃣ Linha 647 — ⭐ PRINCIPAL: Waiting Since (CAUSA DO ERRO 400)

**Contexto:** Conta leads não respondidos (waiting_since não é null).

**Problema:** 
1. Hardcoded em 'rafa-arts' (ignora currentCompany)
2. Sem tratamento de erro — falha silenciosamente
3. **A coluna `waiting_since` não existe no banco** ← Causa do erro 400

### ✅ Solução:
Ver arquivo `APP_TSX_FIX_LINE_647.tsx` (já criado acima).

---

## 7️⃣ Linha 661 — Leads by Phone (webhook processing)

**Contexto:** Busca lead existente pelo telefone ao processar nova mensagem.

**Problema:** Hardcoded em 'rafa-arts'.

### ❌ Antes (Linha 661):
```typescript
const { data: leadRows } = await supabase
  .from('leads')
  .select('*')
  .eq('company_id', 'rafa-arts')  // ❌ Hardcoded
  .eq('phone', msgData.phone || '')
```

### ✅ Depois:
```typescript
const { data: leadRows, error } = await supabase
  .from('leads')
  .select('*')
  .eq('company_id', currentCompany.id)  // ✅ Dinâmico
  .eq('phone', msgData.phone || '')

if (error) {
  console.error('Erro ao buscar lead por phone:', error);
  return;
}
```

---

## 8️⃣ Linha 664, 666 — Funnels (webhook processing, novamente)

**Contexto:** Busca funnels ao processar mensagem (mesma lógica que linha 556/558).

**Problema:** Hardcoded em 'rafa-arts' (x2).

### ✅ Solução:
Mesmo padrão que linhas 556/558 — trocar `'rafa-arts'` por `currentCompany.id` e adicionar tratamento de erro.

---

## 📋 Checklist Completo

### SQL
- [ ] Rodei `supabase/fix_leads_missing_columns.sql` no SQL Editor

### Código (src/App.tsx)
- [ ] Linha 439 (logos): Decidir se logo é global ou por empresa
- [ ] Linha 473 (menu): Mudar para `currentCompany.id` e adicionar `[currentCompany]` na dependência
- [ ] Linha 495 (caixa): Mudar para `currentCompany.id`
- [ ] Linha 543 (leads list): Mudar para `currentCompany.id`
- [ ] Linha 556, 558 (funnels): Mudar para `currentCompany.id` (x2)
- [ ] **Linha 647 (waiting_since): ⭐ PRINCIPAL — usar arquivo `APP_TSX_FIX_LINE_647.tsx`**
- [ ] Linha 661 (leads by phone): Mudar para `currentCompany.id`
- [ ] Linha 664, 666 (funnels novamente): Mudar para `currentCompany.id` (x2)

### Validação
- [ ] Recarreguei o app
- [ ] Erro 400 sumiu ✅
- [ ] Mudei de empresa — todas as queries respondem corretamente

---

## 🧪 Script de Teste (Chrome DevTools)

Cole isso no Console (F12) para verificar se os erros foram corrigidos:

```javascript
// Monitora requisições para o Supabase
const originalFetch = fetch;
window.fetch = function(...args) {
  const [url] = args;
  if (url.includes('supabase.co') && url.includes('/rest/')) {
    console.log('📡 Supabase Request:', url);
  }
  return originalFetch.apply(this, args).then(res => {
    if (url.includes('supabase.co') && res.status === 400) {
      console.error('🔴 400 Bad Request:', url);
    }
    return res;
  });
};
```

Se aparecer "🔴 400 Bad Request" para `waiting_since`, significa que o SQL ainda não foi executado.

