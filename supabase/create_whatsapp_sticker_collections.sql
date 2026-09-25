-- Tabela de coleções de figurinhas do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_sticker_collections (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'rafa-arts',
  name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  created_by_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sticker_collections_company ON public.whatsapp_sticker_collections(company_id);

ALTER TABLE public.whatsapp_sticker_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo em whatsapp_sticker_collections" ON public.whatsapp_sticker_collections;
CREATE POLICY "Permitir tudo em whatsapp_sticker_collections" ON public.whatsapp_sticker_collections FOR ALL USING (true) WITH CHECK (true);

-- Atualiza whatsapp_stickers com colunas de coleção e ordenação
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_stickers' AND column_name = 'collection_id') THEN
    ALTER TABLE public.whatsapp_stickers ADD COLUMN collection_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_stickers' AND column_name = 'collection_name') THEN
    ALTER TABLE public.whatsapp_stickers ADD COLUMN collection_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_stickers' AND column_name = 'display_order') THEN
    ALTER TABLE public.whatsapp_stickers ADD COLUMN display_order INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_stickers' AND column_name = 'created_by') THEN
    ALTER TABLE public.whatsapp_stickers ADD COLUMN created_by TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_stickers' AND column_name = 'created_by_name') THEN
    ALTER TABLE public.whatsapp_stickers ADD COLUMN created_by_name TEXT;
  END IF;
END $$;
