-- Rode esse script no SQL Editor do Supabase
-- Garante que as tabelas whatsapp_groups e user_whatsapp_groups avisem o
-- sistema em tempo real quando mudarem.
--
-- SEM ISSO: quando um grupo novo chega represado (visivel=false) via
-- api/whatsapp-webhook.js, ou quando o admin libera/bloqueia um grupo em
-- WhatsAppGroupsModule.tsx, os listeners 'sidebar-popup-groups' (aba
-- Mensagens > Grupos, ver MessagesSidebarPopup.tsx) e 'whatsapp-groups-admin'
-- (tela de gestão de grupos) ficam "surdos" — o group_jid nunca chega a essas
-- telas por realtime, só reaparecendo depois de um F5 na página. Essa é a
-- causa raiz de grupos do WhatsApp não serem exibidos/atualizados na aba de
-- Mensagens/Grupos em tempo real.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_groups;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_whatsapp_groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_whatsapp_groups;
  END IF;
END $$;
