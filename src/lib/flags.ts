// FASE 3 passo 5: espelha a flag WA_SEM_CRM_MESSAGES do servidor (api/_lib/whatsapp-config.js).
// Quando '1', o WhatsApp deixou de ser gravado em crm_messages: o indice das conversas
// (leads.last_message_*) vem do webhook e o historico vem da Evolution API. Desligada por padrao.
export const SEM_CRM_MESSAGES: boolean =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_WA_SEM_CRM_MESSAGES) === '1';
