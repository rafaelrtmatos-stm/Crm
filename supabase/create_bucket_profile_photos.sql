-- Rode esse SQL no Supabase — bucket das fotos de perfil do WhatsApp espelhadas
-- (api/_lib/foto-perfil-storage.js). A URL de foto que o WhatsApp devolve expira em algumas
-- semanas; o CRM baixa a foto uma vez e guarda aqui. So foto de perfil (arquivos pequenos):
-- a midia das mensagens continua sendo buscada ao vivo na Evolution.
-- E idempotente (pode rodar de novo sem estragar nada).

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Leitura publica: o CRM mostra a foto direto pela URL, num <img>.
drop policy if exists "profile-photos public read" on storage.objects;
create policy "profile-photos public read"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

-- Escrita via chave anon (mesmo padrao "liberado" do resto do projeto). O upsert do caminho
-- fixo <company>/<telefone>.jpg precisa de INSERT e de UPDATE.
drop policy if exists "profile-photos anon insert" on storage.objects;
create policy "profile-photos anon insert"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos');

drop policy if exists "profile-photos anon update" on storage.objects;
create policy "profile-photos anon update"
  on storage.objects for update
  using (bucket_id = 'profile-photos')
  with check (bucket_id = 'profile-photos');

NOTIFY pgrst, 'reload schema';
