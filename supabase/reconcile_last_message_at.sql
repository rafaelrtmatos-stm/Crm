-- Rode esse SQL no Supabase (idempotente). Corrige dados antigos: para cada conversa busca a mensagem
-- MAIS RECENTE em crm_messages (fonte oficial; nota interna nao conta) e, se ela for mais nova que
-- leads.last_message_at (ou o lead estiver sem valor), atualiza o lead:
--   last_message_at / last_message_text / last_message_direction
--   e, se a mensagem for 'incoming': last_client_message_at / last_client_message_text
-- Nunca substitui um dado mais recente por um mais antigo. Pode ser executada quantas vezes quiser
-- (SELECT reconcile_last_message_at();). Em grupo, a previa recebida mostra o remetente ("Maria: texto").
-- Pre-requisito: supabase/add_last_message_at_to_leads.sql (colunas last_message_*).

CREATE OR REPLACE FUNCTION reconcile_last_message_at(p_company_id text DEFAULT 'rafa-arts')
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_total integer;
BEGIN
  WITH ultima AS (
    SELECT DISTINCT ON (m.phone)
           m.phone,
           m.created_at,
           m.direction,
           COALESCE(m.text, '') AS texto,
           CASE
             WHEN m.direction = 'incoming'
              AND COALESCE(m.sender_name, '') <> ''
              AND EXISTS (
                SELECT 1 FROM whatsapp_groups g
                 WHERE g.company_id = m.company_id
                   AND regexp_replace(g.group_jid, '\D', '', 'g') = m.phone
              )
             THEN m.sender_name || ': ' || COALESCE(m.text, '')
             ELSE COALESCE(m.text, '')
           END AS previa
      FROM crm_messages m
     WHERE m.company_id = p_company_id
       AND m.phone IS NOT NULL
       AND COALESCE(m.is_note, false) = false
       AND m.direction <> 'note'
     ORDER BY m.phone, m.created_at DESC, m.id DESC
  ),
  atualizados AS (
    UPDATE leads l
       SET last_message_at        = u.created_at,
           last_message_text      = u.previa,
           last_message_direction = CASE WHEN u.direction = 'incoming' THEN 'incoming' ELSE 'outgoing' END,
           last_client_message_at   = CASE WHEN u.direction = 'incoming' THEN u.created_at ELSE l.last_client_message_at END,
           last_client_message_text = CASE WHEN u.direction = 'incoming' THEN u.texto ELSE l.last_client_message_text END
      FROM ultima u
     WHERE l.company_id = p_company_id
       AND l.phone = u.phone
       AND (l.last_message_at IS NULL OR u.created_at > l.last_message_at)
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM atualizados;

  RETURN v_total;
END;
$$;

SELECT reconcile_last_message_at();

NOTIFY pgrst, 'reload schema';
