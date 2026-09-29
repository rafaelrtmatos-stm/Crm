-- Rode esse script no SQL Editor do Supabase.
-- Cria a coluna que guarda as Mensagens Rapidas (mensagens salvas, com texto e imagem) em "configuracoes".
-- Sem essa coluna o salvamento no banco falha e as mensagens ficam so no navegador de quem criou.
alter table configuracoes
  add column if not exists quick_replies jsonb not null default '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
