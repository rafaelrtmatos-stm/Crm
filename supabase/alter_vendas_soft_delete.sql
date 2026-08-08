-- Rode esse script no SQL Editor do Supabase
-- Exclusao suave de vendas/notas: fica 30 dias em "Excluidos" antes de sumir de vez
alter table vendas add column if not exists deleted_at timestamptz;
