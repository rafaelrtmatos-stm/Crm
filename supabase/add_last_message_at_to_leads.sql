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

-- RECONCILIACAO das conversas antigas: lead sem last_message_at recebe o horario da ultima
-- mensagem que existe em crm_messages (MAX(created_at)). Notas internas nao contam como
-- mensagem da conversa. So preenche onde esta vazio -- nunca sobrescreve um valor existente.
-- (A tela de Mensagens repete essa mesma correcao pra qualquer lead que ainda ficar sem valor.)
UPDATE leads l
   SET last_message_at = m.ultima
  FROM (
    SELECT company_id, phone, MAX(created_at) AS ultima
      FROM crm_messages
     WHERE COALESCE(is_note, false) = false
     GROUP BY company_id, phone
  ) m
 WHERE l.last_message_at IS NULL
   AND m.company_id = l.company_id
   AND m.phone = l.phone;

NOTIFY pgrst, 'reload schema';
