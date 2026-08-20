-- Rode esse SQL no Supabase — captura de mídia real no webhook do WhatsApp
-- (api/whatsapp-webhook.js). Antes só gravava um rótulo de texto ("📷 Imagem"),
-- sem guardar o arquivo em lugar nenhum; agora o arquivo é baixado da Evolution
-- API, subido pro Storage e a URL pública fica salva aqui.

alter table crm_messages add column if not exists file_name text;
alter table crm_messages add column if not exists content_type text; -- image | video | document | audio | sticker | null (texto puro)

-- Bucket público onde o webhook sobe os arquivos de mídia recebidos (imagens, vídeos,
-- documentos, áudios). Público porque o chat (Modules.tsx) exibe a miniatura/baixa
-- direto da URL, sem passar por um endpoint autenticado.
insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', true)
on conflict (id) do nothing;

-- Libera leitura publica e escrita via chave anon (mesmo padrão "liberado" já usado
-- no resto do projeto — ver RLS das outras tabelas em schema.sql/migrate_firestore_*.sql)
-- CREATE POLICY não aceita IF NOT EXISTS no Postgres, entao apaga antes se ja existir
-- (idempotente pra poder rodar esse script de novo sem erro).
drop policy if exists "whatsapp-media public read" on storage.objects;
create policy "whatsapp-media public read"
  on storage.objects for select
  using (bucket_id = 'whatsapp-media');

drop policy if exists "whatsapp-media anon insert" on storage.objects;
create policy "whatsapp-media anon insert"
  on storage.objects for insert
  with check (bucket_id = 'whatsapp-media');

NOTIFY pgrst, 'reload schema';
