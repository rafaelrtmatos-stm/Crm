-- Rode esse SQL no Supabase.
--
-- Por que essa migration: a criacao de lead a partir de mensagem recebida do
-- WhatsApp (src/App.tsx, processIncomingMessage) faz um SELECT pra ver se o lead
-- ja existe e, se nao existir, faz um INSERT — sem nenhuma trava no banco entre
-- essas duas operacoes. Se duas mensagens do mesmo contato chegarem quase juntas
-- (ex: o cliente manda 2 mensagens seguidas rapido), as duas checagens podem
-- rodar antes de qualquer INSERT terminar, e cada uma cria um lead — duplicando
-- o contato (viola a secao 10/11 da auditoria: "mesma pessoa nao deve gerar lead
-- duplicado").
--
-- Essa constraint fecha essa brecha no proprio banco. O codigo (App.tsx) foi
-- ajustado para usar upsert com onConflict + ignoreDuplicates nessa mesma coluna,
-- entao com a constraint criada, a segunda tentativa simplesmente nao faz nada
-- (nao sobrescreve o lead ja criado pela primeira).
--
-- So cobre telefone preenchido (phone <> '') pra nao impedir, por algum motivo,
-- leads antigos sem telefone (ex: vindos de outro canal) de coexistirem.
-- IMPORTANTE: antes de rodar o CREATE UNIQUE INDEX abaixo, rode esse SELECT pra
-- conferir se já existe algum duplicado hoje (se existir, o índice falha ao
-- criar até esses duplicados serem resolvidos manualmente):
--
--   select company_id, phone, count(*) from leads
--   where phone is not null and phone <> ''
--   group by company_id, phone having count(*) > 1;
--
create unique index if not exists idx_leads_company_phone_unique
  on leads(company_id, phone)
  where phone is not null and phone <> '';

NOTIFY pgrst, 'reload schema';
