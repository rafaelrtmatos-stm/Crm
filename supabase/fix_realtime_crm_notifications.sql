-- Adiciona a tabela crm_notifications à publication supabase_realtime
-- para que o sino de notificações atualize instantaneamente em tempo real
-- quando novas mensagens chegarem ou forem marcadas como resolvidas.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'crm_notifications'
  ) then
    alter publication supabase_realtime add table public.crm_notifications;
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
