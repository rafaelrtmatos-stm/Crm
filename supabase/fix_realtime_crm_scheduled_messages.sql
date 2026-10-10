-- Adiciona a tabela crm_scheduled_messages à publication supabase_realtime.
-- Sem isso, uma mensagem agendada num PC só aparece nos outros PCs depois de recarregar a conversa.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'crm_scheduled_messages'
  ) then
    alter publication supabase_realtime add table public.crm_scheduled_messages;
  end if;
end $$;
