-- Rode esse script no SQL Editor do Supabase
-- Separa 3 nomes distintos pra evitar que um sobrescreva o outro sem querer:
-- - full_name (ja existia): Nome Real/Documental -- o que vai em contratos, recibos e cadastros
--   formais. Nunca e' sobrescrito automaticamente por uma mensagem recebida.
-- - whatsapp_name: nome exatamente como veio do perfil/mensagem do WhatsApp (ou outro canal).
--   Atualiza sozinho a cada mensagem nova, sem mexer nos outros dois.
-- - contact_name: nome como o atendente salvou na agenda/conversa -- editavel manualmente,
--   tambem nao sobrescreve full_name.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS whatsapp_name text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contact_name text;

NOTIFY pgrst, 'reload schema';
