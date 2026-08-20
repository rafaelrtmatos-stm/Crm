-- ============================================================
-- FIX: Adicionar colunas faltantes na tabela leads
-- ============================================================
-- A tabela leads foi criada com um schema incompleto
-- Faltam 6 colunas que o código React usa
-- Rode esse script no SQL Editor do Supabase
-- ============================================================

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_message_direction TEXT,
ADD COLUMN IF NOT EXISTS waiting_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_transcribe BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS unread BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Recarrega o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
