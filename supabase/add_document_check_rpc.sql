-- Rode esse script no SQL Editor do Supabase
-- Checagem extra de identidade na tela publica de assinatura (/assinar/:id), ANTES de liberar
-- os campos do codigo OTP (Clausula 8). O cliente digita os 3 ultimos digitos do CPF/CNPJ dele;
-- essa funcao compara dentro do banco e devolve so um true/false -- o cpf_cnpj completo NUNCA
-- e enviado pro navegador do cliente (diferente de simplesmente dar select em cpf_cnpj), entao
-- nao da pra "ler" o documento pela aba de rede do navegador.

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
      and right(regexp_replace(cpf_cnpj, '\D', '', 'g'), 3) = p_last_digits
  );
$$;

-- Precisa poder ser chamada sem login (cliente acessa o link sem autenticacao),
-- mas so devolve boolean -- nunca o dado em si.
grant execute on function public.check_contrato_document_last_digits(uuid, text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
