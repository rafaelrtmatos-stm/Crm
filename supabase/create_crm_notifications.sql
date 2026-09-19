-- ESPELHO do que JA ESTA APLICADO em producao (projeto Supabase "CRMRafa").
-- NAO precisa rodar de novo la: serve de documentacao e pra recriar o mesmo banco em outro
-- ambiente. E idempotente (pode rodar sem estragar nada).
--
-- NOTIFICACOES DE MENSAGEM (pendente / resolvida)
--   * UMA LINHA POR MENSAGEM recebida (message_id unico). O gatilho abaixo cria a linha com
--     status 'pending' pra toda mensagem de cliente (direction = 'incoming'), inclusive de
--     grupo liberado (is_group/group_id), ja com nome (title), foto, previa e horario.
--     Nota interna e historico importado (is_historical_import) nao geram notificacao.
--   * O gatilho NUNCA bloqueia a gravacao da mensagem: qualquer erro nele vira so um WARNING.
--   * Status: 'pending' | 'resolved'. Abrir/visualizar a conversa NAO mexe nesta tabela; so o
--     botao "Marcar como resolvido" faz UPDATE status='resolved' (ver
--     src/components/NotificacaoPendenteBanner.tsx).
--   * Mensagem nova depois de resolvida = linha nova 'pending' (cada mensagem tem a sua).
--   * O front agrupa as pendentes do mesmo phone num unico aviso.

create table if not exists crm_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  message_id uuid not null unique references crm_messages(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  phone text not null,
  group_id uuid references whatsapp_groups(id) on delete set null,
  is_group boolean not null default false,
  title text,
  sender_name text,
  photo_url text,
  preview text,
  message_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_notifications_phone on crm_notifications(company_id, phone, status);
create index if not exists idx_crm_notifications_status on crm_notifications(company_id, status, message_at desc);

alter table crm_notifications enable row level security;
drop policy if exists "allow all crm_notifications" on crm_notifications;
create policy "allow all crm_notifications" on crm_notifications for all using (true) with check (true);

create or replace function crm_notify_incoming_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lead record;
  v_group record;
  v_digits text;
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

    insert into crm_notifications (
      company_id, message_id, lead_id, phone, group_id, is_group,
      title, sender_name, photo_url, preview, message_at
    ) values (
      new.company_id, new.id, coalesce(new.lead_id, v_lead.id), new.phone, v_group.id, v_group.id is not null,
      case when v_group.id is not null then coalesce(v_group.nome, new.sender_name, new.phone)
           else coalesce(v_lead.nome, new.sender_name, new.phone) end,
      new.sender_name,
      v_lead.photo_url,
      left(coalesce(
        nullif(btrim(new.text), ''),
        case new.content_type
          when 'audio' then '🎤 Áudio'
          when 'image' then '📷 Imagem'
          when 'video' then '🎥 Vídeo'
          when 'document' then '📄 Documento'
          else 'Nova mensagem'
        end), 140),
      new.created_at
    )
    on conflict (message_id) do nothing;
  exception when others then
    raise warning 'crm_notify_incoming_message falhou: %', sqlerrm;
  end;

  return new;
end;
$function$;

drop trigger if exists trg_crm_notify_incoming_message on crm_messages;
create trigger trg_crm_notify_incoming_message
  after insert on crm_messages
  for each row execute function crm_notify_incoming_message();

-- Tempo real: o aviso no chat aparece/some na hora quando a notificacao muda
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND tablename = 'crm_notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE crm_notifications;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
