-- Rode esse SQL no Supabase — notificações persistentes de conversa pendente.
-- Regra principal: ABRIR/VISUALIZAR a conversa NÃO resolve a notificação. Ela fica
-- 'pending' até alguém clicar em "Marcar como resolvido" (status -> 'resolved').
--
-- Formato ENXUTO: uma linha por CONVERSA (phone), não uma linha por mensagem.
-- waiting_since só é definido quando a conversa entra em 'pending' (não existia ou
-- já tinha sido resolvida) — mensagens novas enquanto já está pendente atualizam só
-- o preview/message_at, sem resetar o relógio de espera.
-- Não referencia crm_messages: pode ser mantida mesmo se o conteúdo das mensagens
-- deixar de ser gravado no Supabase.

create table if not exists public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  phone text not null,
  lead_id uuid references public.leads(id) on delete set null,
  group_id uuid references public.whatsapp_groups(id) on delete set null,
  is_group boolean not null default false,
  title text,
  sender_name text,
  photo_url text,
  preview text,
  message_at timestamptz not null,
  waiting_since timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  resolved_at timestamptz,
  resolved_by text,
  updated_at timestamptz not null default now(),
  unique (company_id, phone)
);

create index if not exists idx_crm_notifications_status on public.crm_notifications (company_id, status, waiting_since asc);

alter table public.crm_notifications enable row level security;
drop policy if exists "allow all crm_notifications" on public.crm_notifications;
create policy "allow all crm_notifications" on public.crm_notifications for all using (true) with check (true);

-- Gera/atualiza a notificação direto no banco a cada mensagem recebida (funciona mesmo com
-- o CRM fechado). Nunca bloqueia a gravação da mensagem: qualquer erro vira só um WARNING.
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
      title, sender_name, photo_url, preview, message_at, waiting_since, status,
      resolved_at, resolved_by, updated_at
    ) values (
      new.company_id, new.phone, coalesce(new.lead_id, v_lead.id), v_group.id, v_group.id is not null,
      v_title, new.sender_name, v_lead.photo_url, v_preview, new.created_at, new.created_at, 'pending',
      null, null, now()
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
      -- só reinicia o relógio de espera se a conversa NÃO estava pendente ainda
      waiting_since = case when crm_notifications.status = 'pending' then crm_notifications.waiting_since else excluded.waiting_since end,
      status = 'pending',
      resolved_at = null,
      resolved_by = null,
      updated_at = now();
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

-- Lista as conversas pendentes que o usuário PODE ver (regra 11): conversas normais sempre;
-- grupos só se o usuário estiver em user_whatsapp_groups para aquele grupo.
-- Nome e foto vêm do lead atual (o lead pode ter sido criado depois da mensagem).
create or replace function public.crm_notifications_visible(p_user_id text, p_status text default 'pending')
returns table (
  id uuid, phone text, lead_id uuid, group_id uuid, is_group boolean,
  title text, sender_name text, photo_url text, preview text, message_at timestamptz,
  waiting_since timestamptz, status text, resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.phone, coalesce(n.lead_id, l.id), n.group_id, n.is_group,
         case when n.is_group
              then coalesce(g.nome, n.title, n.phone)
              else coalesce(nullif(l.contact_name, ''), nullif(l.full_name, ''), nullif(l.whatsapp_name, ''), n.title, n.phone)
         end,
         n.sender_name,
         coalesce(l.photo_url, n.photo_url),
         n.preview, n.message_at, n.waiting_since, n.status, n.resolved_at
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
   order by n.waiting_since asc;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_notifications') then
    alter publication supabase_realtime add table public.crm_notifications;
  end if;
end $$;

-- MIGRAÇÃO: se a tabela crm_notifications já existir no formato antigo (1 linha por
-- mensagem, com message_id obrigatório), rode este bloco manualmente ANTES do create table
-- acima falhar por já existir — consolide o que já tem pendente em 1 linha por telefone e
-- solte a dependência de crm_messages:
--
--   alter table public.crm_notifications drop constraint if exists crm_notifications_message_id_fkey;
--   alter table public.crm_notifications drop column if exists message_id;
--   alter table public.crm_notifications add column if not exists waiting_since timestamptz;
--   update public.crm_notifications set waiting_since = message_at where waiting_since is null;
--   alter table public.crm_notifications alter column waiting_since set not null;
--   -- remove duplicatas por telefone, mantendo a pendente mais antiga (ou a mais recente resolvida)
--   delete from public.crm_notifications a using public.crm_notifications b
--    where a.company_id = b.company_id and a.phone = b.phone and a.id > b.id;
--   alter table public.crm_notifications add constraint crm_notifications_company_phone_key unique (company_id, phone);

NOTIFY pgrst, 'reload schema';
