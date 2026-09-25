-- Apagar mensagem NUNCA remove a linha de crm_messages -- so marca (deleted_at/deleted_by) e o
-- chat passa a mostrar um placeholder ("Mensagem apagada" / "Você apagou essa mensagem para
-- todos") no lugar do texto/mídia original, que fica preservado no banco.
-- Editar mensagem reaproveita os campos versions/current_version_index/last_edited_at/
-- last_edited_by que já existiam só para notas internas (crm_notes) -- agora servem também
-- para mensagens reais (minhas, editadas pelo botão do CRM, e do cliente, editadas no
-- WhatsApp dele).
alter table crm_messages add column if not exists deleted_at timestamptz;
alter table crm_messages add column if not exists deleted_by text; -- 'cliente' | nome de quem apagou (ex: "Rafael (Adm)") | 'Celular'
