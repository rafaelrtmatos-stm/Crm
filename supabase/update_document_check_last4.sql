-- Rode esse script no SQL Editor do Supabase (DEPOIS de add_document_check_rpc.sql)
-- Atualiza a checagem extra de identidade na tela publica de assinatura (/assinar/:id) de
-- 3 para 4 ultimos digitos do CPF/CNPJ. Motivo: 3 digitos era pouco (mais chance de erro/
-- ambiguidade na hora do cliente confirmar), 4 digitos da mais garantia sem expor o documento
-- completo. O front-end (ContractSignaturePublicPage.tsx / otpUtils.ts) ja manda 4 digitos.

create or replace function public.check_contrato_document_last_digits(
  p_contract_id uuid,
  p_last_digits text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from contratos
    where id = p_contract_id
      and cpf_cnpj is not null
      and right(regexp_replace(cpf_cnpj, '\D', '', 'g'), 4) = p_last_digits
  );
$$;

grant execute on function public.check_contrato_document_last_digits(uuid, text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
