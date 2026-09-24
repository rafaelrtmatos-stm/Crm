-- CORRECAO do gatilho crm_notify_incoming_message para o formato ENXUTO de crm_notifications
-- (1 linha por conversa, UNIQUE company_id + phone, com waiting_since).
--
-- POR QUE: a migration "crm_notifications_formato_enxuto" (23/09) removeu a coluna message_id, mas o gatilho
-- continuou fazendo INSERT ... message_id ... ON CONFLICT (message_id). Resultado: em TODA mensagem recebida ele
-- falhava com `column "message_id" of relation "crm_notifications" does not exist` (o gatilho engole o erro
-- e so emite WARNING, entao a mensagem era gravada normalmente e ninguem percebia) e NENHUMA notificacao
-- foi criada/atualizada desde 22/09. O front tambem consultava por message_id (HTTP 400) -- corrigido em
-- src/components/NotificacaoPendenteBanner.tsx.
--
-- REGRA: conversa nova ou ja resolvida -> vira 'pending' e o relogio (waiting_since) comeca agora; conversa que
-- ja esta pendente -> so atualiza previa/horario, SEM reiniciar o relogio de espera.
-- Nunca bloqueia a gravacao da mensagem (qualquer erro vira WARNING). Idempotente.

create or replace function public.crm_notify_incoming_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead record;
  v_group record;
  v_digits text;
  v_title text;
  v_preview text;
begin
  if new.direction is distinct from 'incoming'
     or coalesce(new.is_note, false)
     or coalesce(new.is_historical_import, false) then
    return new;
  end if;

  begin
    v_digits := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');

    select g.id, g.nome into v_group
      from whatsapp_groups g
     where g.company_id = new.company_id
       and regexp_replace(g.group_jid, '\D', '', 'g') = v_digits
     limit 1;

    select l.id, l.photo_url,
           coalesce(nullif(l.contact_name, ''), nullif(l.full_name, ''), nullif(l.whatsapp_name, '')) as nome
      into v_lead
      from leads l
     where l.company_id = new.company_id
       and (l.id = new.lead_id or l.phone = new.phone)
     order by (l.id = new.lead_id) desc, l.updated_at desc
     limit 1;

    v_title := case when v_group.id is not null then coalesce(v_group.nome, new.sender_name, new.phone)
                    else coalesce(v_lead.nome, new.sender_name, new.phone) end;

    v_preview := left(coalesce(
        nullif(btrim(new.text), ''),
        case new.content_type
          when 'audio' then '🎤 Áudio'
          when 'image' then '📷 Imagem'
          when 'video' then '🎥 Vídeo'
          when 'document' then '📄 Documento'
          else 'Nova mensagem'
        end), 140);

    insert into crm_notifications (
      company_id, phone, lead_id, group_id, is_group,
      title, sender_name, photo_url, preview, message_at, waiting_since, status, resolved_at, resolved_by
    ) values (
      new.company_id, new.phone, coalesce(new.lead_id, v_lead.id), v_group.id, v_group.id is not null,
      v_title, new.sender_name, v_lead.photo_url, v_preview, new.created_at, new.created_at, 'pending', null, null
    )
    on conflict (company_id, phone) do update set
      lead_id = coalesce(excluded.lead_id, crm_notifications.lead_id),
      group_id = coalesce(excluded.group_id, crm_notifications.group_id),
      is_group = excluded.is_group,
      title = excluded.title,
      sender_name = excluded.sender_name,
      photo_url = coalesce(excluded.photo_url, crm_notifications.photo_url),
      preview = excluded.preview,
      message_at = excluded.message_at,
      -- so reinicia o relogio de espera se a conversa NAO estava pendente
      waiting_since = case when crm_notifications.status = 'pending' then crm_notifications.waiting_since else excluded.waiting_since end,
      status = 'pending',
      resolved_at = null,
      resolved_by = null;
  exception when others then
    raise warning 'crm_notify_incoming_message falhou: %', sqlerrm;
  end;

  return new;
end;
$function$;

-- O gatilho em si (AFTER INSERT em crm_messages) ja existe em producao; recriado so por idempotencia.
drop trigger if exists trg_crm_notify_incoming_message on public.crm_messages;
create trigger trg_crm_notify_incoming_message
  after insert on public.crm_messages
  for each row execute function public.crm_notify_incoming_message();

NOTIFY pgrst, 'reload schema';
