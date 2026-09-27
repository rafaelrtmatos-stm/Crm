# 📇 Sincronização Google Contatos (Clientes) — PLANEJADO, NÃO IMPLEMENTADO

> Status: aguardando o Rafael dizer "implementar Google Contatos".
> **Apagar este arquivo depois que a feature for implementada e revisada** — ele existe só
> pra guardar o plano/arquitetura entre sessões, não é documentação permanente do sistema.

## Pedido original

- Criar botão "Sincronizar Google Contatos" em Clientes.
- Login/autorização Google.
- Importar nome, telefone, e-mail e foto.
- Não duplicar contatos: identificar principalmente pelo telefone normalizado.
- Mostrar contatos novos e atualizar dados existentes sem apagar dados do CRM.
- Permitir sincronização manual.
- Salvar vínculo com o contato Google para futuras sincronizações.
- Usar syncToken quando disponível para sincronizações incrementais.
- Não expor tokens/secrets no frontend.
- Usar o menor escopo necessário; leitura usa `contacts.readonly`.
- Manter todas as funcionalidades existentes.

## Arquitetura atual relevante (levantada em 2026-09-27)

- Frontend React+Vite. Tela de Clientes = `src/components/ContactsModule.tsx`, grava direto
  na tabela `clientes` do Supabase (sem API no meio).
- Backend = funções serverless em `api/*.js` (Vercel). Padrão do WhatsApp
  (`api/whatsapp-connect.js`): front nunca fala direto com serviço externo, sempre via
  endpoint que segura a chave/token. Autorização via header `x-user-id` checado contra
  tabela `usuarios` (`api/_lib/auth.js`).
- Dedupe já existe e é forte: `src/lib/clienteDedupe.ts` (CPF, nome, telefone) +
  `src/lib/phone.ts` (normaliza telefone BR pro formato `55DDD9XXXXXXXX`). Reaproveitar 100%.
- `firebase/auth` importa `GoogleAuthProvider`/`signInWithPopup` em `src/App.tsx`, mas é
  import morto — não tem fluxo Google funcionando hoje. Não dá pra usar o popup do Firebase
  puro porque o token dele é de curta duração no cliente; o pedido exige refresh_token
  guardado no servidor pra sync incremental com syncToken. Precisa ser OAuth server-side
  de verdade (Google Cloud Console, não Firebase Auth popup).
- `src/components/IntegracoesModule.tsx` tem o padrão de "canais" (WhatsApp/Facebook/
  Instagram) — é onde a conexão/autorização Google deveria aparecer como card novo. O botão
  de sync em si fica em Clientes, como pedido.
- Tabela `clientes` (schema base em `supabase/schema.sql`, várias colunas adicionadas depois
  via `supabase/add_*.sql`) **não tem** coluna de foto ainda.

## Arquivos a criar/mexer quando for implementar

**Google Cloud (fora do repo, configuração manual do Rafael):**
- Projeto no Google Cloud Console + OAuth Client ID/Secret (tipo Web)
- People API ativada
- Escopo `contacts.readonly`
- Redirect URI apontando pro domínio Vercel do CRM

**Backend (novo):**
- `api/_lib/google-config.js` — envs (CLIENT_ID / CLIENT_SECRET / REDIRECT_URI)
- `api/google-contacts-auth.js` — inicia OAuth (redirect) + callback, troca code por tokens
- `api/_lib/google-contacts-token.js` — refresh do access_token a partir do refresh_token
- `api/google-contacts-sync.js` — chama People API (`people.connections.list`, com
  `syncToken` quando existir), aplica dedupe/merge e grava em `clientes`

**Banco (nova migration em `supabase/`):**
- Tabela `google_contacts_conexao` (ou colunas em `usuarios`): `refresh_token`
  (criptografado), `sync_token`, `connected_at`, `google_email`
- Colunas novas em `clientes`: `google_contact_id` (chave de vínculo),
  `google_resource_name`, `foto_url` (não existe ainda)

**Frontend:**
- `src/components/IntegracoesModule.tsx` — card novo "Google Contatos" (conectar/
  desconectar, status da conexão)
- `src/components/ContactsModule.tsx` — botão "Sincronizar Google Contatos" (chama
  `api/google-contacts-sync.js`, mostra resumo de novos/atualizados)
- `src/lib/phone.ts` / `src/lib/clienteDedupe.ts` — reaproveitar; talvez pequeno ajuste
  pra aceitar candidato vindo do Google antes de gravar

## Próximo passo quando o Rafael mandar "implementar"

Confirmar com ele: migration primeiro, depois backend (auth/sync), depois frontend —
ou ver a tela de Integrações antes. (Pergunta feita em 2026-09-27, ele ainda não respondeu.)
