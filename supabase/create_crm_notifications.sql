-- Rode esse SQL no Supabase — notificações persistentes de mensagens de clientes.
-- Regra principal: ABRIR/VISUALIZAR a conversa NÃO resolve a notificação. Ela fica
-- 'pending' até alguém clicar em "Marcar como resolvido" (status -> 'resolved').
-- Uma linha por mensagem recebida; a interface agrupa por conversa (phone).
-- Mensagem nova depois de resolvida = nova linha 'pending'.

create table if not exists public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  message_id uuid not null references public.crm_messages(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  phone text not null,
  group_id uuid references public.whatsapp_groups(id) on delete set null,
  is_group boolean not null default false,
  title text,
  sender_name text,
  photo_url text,
  preview text,
  message_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  unique (message_id)
);

create index if not exists idx_crm_notifications_status on public.crm_notifications (company_id, status, message_at desc);
create index if not exists idx_crm_notifications_phone on public.crm_notifications (company_id, phone, status);

alter table public.crm_notifications enable row level security;
drop policy if exists "allow all crm_notifications" on public.crm_notifications;
create policy "allow all crm_notifications" on public.crm_notifications for all using (true) with check (true);

-- Gera a notificação direto no banco a cada mensagem recebida (funciona mesmo com o CRM fechado).
-- Nunca bloqueia a gravação da mensagem: qualquer erro vira só um WARNING.
create or replace function public.crm_notify_incoming_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

drop trigger if exists trg_crm_notify_incoming_message on public.crm_messages;
create trigger trg_crm_notify_incoming_message
  after insert on public.crm_messages
  for each row execute function public.crm_notify_incoming_message();

-- Lista as notificações que o usuário PODE ver (regra 11): conversas normais sempre;
-- grupos só se o usuário estiver em user_whatsapp_groups para aquele grupo.
-- Nome e foto vêm do lead atual (o lead pode ter sido criado depois da mensagem).
create or replace function public.crm_notifications_visible(p_user_id text, p_status text default 'pending')
returns table (
  id uuid, message_id uuid, phone text, lead_id uuid, group_id uuid, is_group boolean,
  title text, sender_name text, photo_url text, preview text, message_at timestamptz,
  status text, resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.message_id, n.phone, coalesce(n.lead_id, l.id), n.group_id, n.is_group,
         case when n.is_group
              then coalesce(g.nome, n.title, n.phone)
              else coalesce(nullif(l.contact_name, ''), nullif(l.full_name, ''), nullif(l.whatsapp_name, ''), n.title, n.phone)
         end,
         n.sender_name,
         coalesce(l.photo_url, n.photo_url),
         n.preview, n.message_at, n.status, n.resolved_at
    from crm_notifications n
    left join lateral (
      select x.* from leads x
       where x.company_id = n.company_id and (x.id = n.lead_id or x.phone = n.phone)
       order by (x.id = n.lead_id) desc, x.updated_at desc
       limit 1
    ) l on true
    left join whatsapp_groups g on g.id = n.group_id
   where n.company_id = 'rafa-arts'
     and n.status = p_status
     and (
       not n.is_group
       -- admin master (Firebase, sem linha em usuarios) não dá pra atribuir em user_whatsapp_groups:
       -- enxerga todos os grupos liberados. Os demais (inclusive admins comuns) só os atribuídos a eles.
       or not exists (select 1 from usuarios u where u.id::text = p_user_id)
       or (n.group_id is not null and exists (
             select 1 from user_whatsapp_groups ug
              where ug.group_id = n.group_id and ug.user_id::text = p_user_id))
     )
   order by n.message_at asc;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_notifications') then
    alter publication supabase_realtime add table public.crm_notifications;
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
