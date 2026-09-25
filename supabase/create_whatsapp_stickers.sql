-- Tabela de figurinhas do WhatsApp salvas pela empresa
CREATE TABLE IF NOT EXISTS public.whatsapp_stickers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'rafa-arts',
  name TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_stickers_company ON public.whatsapp_stickers(company_id);

ALTER TABLE public.whatsapp_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo em whatsapp_stickers" ON public.whatsapp_stickers FOR ALL USING (true) WITH CHECK (true);
