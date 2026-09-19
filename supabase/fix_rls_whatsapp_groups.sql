-- Rode esse SQL no Supabase (idempotente).
--
-- whatsapp_groups e user_whatsapp_groups estavam com RLS ligado e SEM nenhuma politica: o webhook nao
-- conseguia cadastrar grupo novo, o CRM nao conseguia ler a lista de grupos e a tela de liberar grupos
-- ficava vazia. Mesmo padrao das demais tabelas do CRM ("allow all").
DROP POLICY IF EXISTS "allow all whatsapp_groups" ON public.whatsapp_groups;
CREATE POLICY "allow all whatsapp_groups" ON public.whatsapp_groups FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow all user_whatsapp_groups" ON public.user_whatsapp_groups;
CREATE POLICY "allow all user_whatsapp_groups" ON public.user_whatsapp_groups FOR ALL TO public USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- O administrador (login "admin-rafael") nao esta na tabela usuarios (e user_whatsapp_groups.user_id e uuid),
-- entao a escolha "quais grupos o ADM quer ver" fica nesta coluna, marcada na tela Grupos do WhatsApp
-- (menu ⋮ da aba Mensagens). Grupo so aparece pro ADM se visivel = true E admin_ve = true.
ALTER TABLE public.whatsapp_groups ADD COLUMN IF NOT EXISTS admin_ve boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
