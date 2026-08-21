-- Rode esse script no SQL Editor do Supabase
-- Adiciona soft-delete (lixeira) aos serviços de comissões: em vez de apagar de vez,
-- "excluir" só marca deleted_at. O serviço some da planilha normal mas fica
-- disponível na Lixeira por 30 dias, podendo ser restaurado.

alter table comissoes_servicos
  add column if not exists deleted_at timestamptz;

create index if not exists idx_comissoes_servicos_deleted_at
  on comissoes_servicos(deleted_at);

NOTIFY pgrst, 'reload schema';
