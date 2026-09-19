-- Rode esse SQL no Supabase (idempotente: CREATE OR REPLACE).
--
-- Mesclar leads do MESMO contato (mesmo telefone, inclusive gravado em formato diferente: com/sem 55, com/sem o 9).
-- Chamada pelo CRM (Mensagens > menu ⋮ > "Mesclar contatos duplicados", src/components/MergeLeadsModal.tsx):
--
--   select crm_mesclar_leads(<lead principal>, array[<leads duplicados>], '<telefone final, so digitos>');
--
-- Tudo acontece numa unica transacao (ou mescla tudo, ou nao muda nada):
--  1. Reaponta pro lead PRINCIPAL tudo que era dos duplicados: crm_messages (lead_id e telefone -> o chat unico
--     mostra todo o historico), crm_notifications e robozinho_interactions (que seria apagado em cascata).
--  2. Completa o principal com o que ele nao tinha (nome real no lugar de "+55...", e-mail, CPF/CNPJ, cidade,
--     foto, responsavel, tags reunidas, maior valor estimado, prioridade "alta" se algum era).
--  3. Ultima mensagem (last_message_*, waiting_since) = a da conversa mais recente entre todos; ultima do cliente idem.
--     Etapa/funil, silenciar e demais configuracoes do principal ficam como estao.
--  4. Apaga os duplicados e grava o telefone final no principal (por ultimo, pra nao colidir com indice unico).

CREATE OR REPLACE FUNCTION public.crm_mesclar_leads(p_principal uuid, p_duplicados uuid[], p_phone_final text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_ids       uuid[];
  v_empresas  int;
  v_company   text;
  v_encontr   int;
  v_fones     text[];
  v_fone_fim  text;
  v_nome      record;
  v_ult       record;
  v_cli       record;
  v_msgs      int := 0;
BEGIN
  IF p_principal IS NULL OR p_duplicados IS NULL OR coalesce(array_length(p_duplicados, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Informe o lead principal e ao menos um duplicado.';
  END IF;
  IF p_principal = ANY (p_duplicados) THEN
    RAISE EXCEPTION 'O lead principal nao pode estar na lista de duplicados.';
  END IF;

  SELECT array_agg(DISTINCT x) INTO p_duplicados FROM unnest(p_duplicados) x;
  v_ids := array_append(p_duplicados, p_principal);

  -- trava as linhas: dois cliques / duas telas nao mesclam o mesmo lead ao mesmo tempo
  PERFORM 1 FROM leads WHERE id = ANY (v_ids) FOR UPDATE;

  SELECT count(*), count(DISTINCT company_id), min(company_id)
    INTO v_encontr, v_empresas, v_company
    FROM leads WHERE id = ANY (v_ids);
  IF v_encontr <> array_length(v_ids, 1) THEN
    RAISE EXCEPTION 'Algum lead informado nao existe mais (talvez ja tenha sido mesclado). Recarregue a lista.';
  END IF;
  IF v_empresas <> 1 THEN
    RAISE EXCEPTION 'Leads de empresas diferentes nao podem ser mesclados.';
  END IF;

  SELECT array_agg(DISTINCT phone) INTO v_fones FROM leads WHERE id = ANY (v_ids) AND coalesce(phone, '') <> '';
  SELECT coalesce(nullif(regexp_replace(coalesce(p_phone_final, ''), '\D', '', 'g'), ''), phone) INTO v_fone_fim FROM leads WHERE id = p_principal;

  -- conversa mais recente / ultima mensagem do cliente mais recente entre todos
  SELECT last_message_at, last_message_text, last_message_direction, waiting_since INTO v_ult
    FROM leads WHERE id = ANY (v_ids)
   ORDER BY last_message_at DESC NULLS LAST, (id = p_principal) DESC LIMIT 1;
  SELECT last_client_message_at, last_client_message_text INTO v_cli
    FROM leads WHERE id = ANY (v_ids)
   ORDER BY last_client_message_at DESC NULLS LAST, (id = p_principal) DESC LIMIT 1;

  -- melhor nome: o do principal, se for real (nao vazio e nao "+55..."); senao o primeiro real dos duplicados
  SELECT full_name, first_name, last_name INTO v_nome
    FROM leads WHERE id = ANY (v_ids) AND nullif(btrim(full_name), '') IS NOT NULL AND full_name NOT LIKE '+%'
   ORDER BY (id = p_principal) DESC, created_at LIMIT 1;

  -- 1) mensagens, notificacoes e historico do robozinho passam a ser do principal
  UPDATE crm_messages
     SET lead_id = p_principal, phone = v_fone_fim
   WHERE company_id = v_company AND (lead_id = ANY (v_ids) OR phone = ANY (v_fones));
  GET DIAGNOSTICS v_msgs = ROW_COUNT;

  UPDATE crm_notifications SET lead_id = p_principal, phone = v_fone_fim WHERE lead_id = ANY (p_duplicados);
  UPDATE robozinho_interactions SET lead_id = p_principal WHERE lead_id = ANY (p_duplicados);

  -- 2) e 3) completa o principal e acerta a ultima mensagem
  UPDATE leads p SET
    full_name       = coalesce(v_nome.full_name, p.full_name),
    first_name      = CASE WHEN v_nome.full_name IS NOT NULL THEN v_nome.first_name ELSE p.first_name END,
    last_name       = CASE WHEN v_nome.full_name IS NOT NULL THEN v_nome.last_name ELSE p.last_name END,
    whatsapp_name   = coalesce(nullif(p.whatsapp_name, ''), (SELECT c.whatsapp_name FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.whatsapp_name, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    contact_name    = coalesce(nullif(p.contact_name, ''), (SELECT c.contact_name FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.contact_name, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    email           = coalesce(nullif(p.email, ''), (SELECT c.email FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.email, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    cpf_cnpj        = coalesce(nullif(p.cpf_cnpj, ''), (SELECT c.cpf_cnpj FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.cpf_cnpj, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    city            = coalesce(nullif(p.city, ''), (SELECT c.city FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.city, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    state           = coalesce(nullif(p.state, ''), (SELECT c.state FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.state, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    photo_url       = coalesce(nullif(p.photo_url, ''), (SELECT c.photo_url FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.photo_url, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    responsible_user_id = coalesce(nullif(p.responsible_user_id, ''), (SELECT c.responsible_user_id FROM leads c WHERE c.id = ANY (v_ids) AND nullif(c.responsible_user_id, '') IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    tracking        = coalesce(p.tracking, (SELECT c.tracking FROM leads c WHERE c.id = ANY (v_ids) AND c.tracking IS NOT NULL ORDER BY c.created_at LIMIT 1)),
    tags            = (SELECT array_agg(DISTINCT t) FROM leads c, unnest(coalesce(c.tags, '{}')) t WHERE c.id = ANY (v_ids)),
    estimated_value = (SELECT max(coalesce(c.estimated_value, 0)) FROM leads c WHERE c.id = ANY (v_ids)),
    priority        = CASE WHEN EXISTS (SELECT 1 FROM leads c WHERE c.id = ANY (v_ids) AND c.priority = 'alta') THEN 'alta' ELSE p.priority END,
    unread          = (SELECT bool_or(coalesce(c.unread, false)) FROM leads c WHERE c.id = ANY (v_ids)),
    archived        = (SELECT bool_and(coalesce(c.archived, false)) FROM leads c WHERE c.id = ANY (v_ids)),
    created_at      = (SELECT min(c.created_at) FROM leads c WHERE c.id = ANY (v_ids)),
    last_message_at        = v_ult.last_message_at,
    last_message_text      = v_ult.last_message_text,
    last_message_direction = v_ult.last_message_direction,
    waiting_since          = v_ult.waiting_since,
    last_client_message_at   = v_cli.last_client_message_at,
    last_client_message_text = v_cli.last_client_message_text,
    updated_at      = now()
  WHERE p.id = p_principal;

  -- 4) apaga os duplicados e so entao grava o telefone final no principal
  DELETE FROM leads WHERE id = ANY (p_duplicados);
  UPDATE leads SET phone = v_fone_fim WHERE id = p_principal AND phone IS DISTINCT FROM v_fone_fim;

  RETURN jsonb_build_object('principal', p_principal, 'mesclados', array_length(p_duplicados, 1), 'mensagens_reapontadas', v_msgs, 'telefone', v_fone_fim);
END;
$$;

NOTIFY pgrst, 'reload schema';
