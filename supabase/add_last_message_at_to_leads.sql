-- Rode esse SQL no Supabase (idempotente: pode rodar mais de uma vez sem estragar nada).
--
-- A lista de conversas (aba Mensagens -- src/components/MessagesSidebarPopup.tsx) era ordenada
-- por leads.updated_at, que muda com QUALQUER edicao do cadastro (mudar etapa, nome, silenciar,
-- arquivar...) e nao com a mensagem. Agora a ordem depende so da ULTIMA MENSAGEM REAL da
-- conversa, recebida ou enviada:
--
--   last_message_at        = horario ORIGINAL da ultima mensagem (recebida ou enviada)
--   last_message_direction = 'incoming' | 'outgoing'
--   last_message_text      = texto da ultima mensagem (previa da lista)
--
-- Quem grava: api/whatsapp-webhook.js (mensagem recebida / enviada fora do CRM),
-- api/whatsapp-send.js (mensagem enviada pelo CRM, so depois que o WhatsApp confirma) e
-- src/App.tsx (lead novo criado por mensagem recebida).

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_message_direction text;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_message_text text;

-- Ordenar a lista por last_message_at desc (nulos por ultimo) fica rapido com esse indice.
CREATE INDEX IF NOT EXISTS idx_leads_company_last_message_at
  ON leads (company_id, last_message_at DESC NULLS LAST);

-- RECONCILIACAO: crm_messages e a fonte oficial das mensagens; leads.last_message_at e so o
-- indice/cache usado pra montar e ordenar a lista. Sempre que houver diferenca, corrige o lead:
-- se a ultima mensagem real em crm_messages (nota interna nao conta) for MAIS RECENTE que
-- leads.last_message_at (ou o lead estiver sem valor), atualiza last_message_at, last_message_text
-- e last_message_direction. Igual ou anterior: nao altera. Pode rodar mais de uma vez.
-- (A tela de Mensagens repete essa mesma correcao pra qualquer conversa que ficar defasada.)
UPDATE leads l
   SET last_message_at        = m.created_at,
       last_message_text      = COALESCE(m.text, ''),
       last_message_direction = CASE WHEN m.direction = 'incoming' THEN 'incoming' ELSE 'outgoing' END
  FROM (
    SELECT DISTINCT ON (company_id, phone)
           company_id, phone, created_at, text, direction
      FROM crm_messages
     WHERE COALESCE(is_note, false) = false
       AND direction <> 'note'
     ORDER BY company_id, phone, created_at DESC
  ) m
 WHERE m.company_id = l.company_id
   AND m.phone = l.phone
   AND (l.last_message_at IS NULL OR m.created_at > l.last_message_at);

NOTIFY pgrst, 'reload schema';
