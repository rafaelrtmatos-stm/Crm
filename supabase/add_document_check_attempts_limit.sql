-- Rode esse script no SQL Editor do Supabase (DEPOIS de update_document_check_last4.sql)
-- Adiciona limite de 5 tentativas (server-side) pra checagem dos 4 ultimos digitos do
-- CPF/CNPJ na tela publica de assinatura (/assinar/:id) -- usada tanto pra liberar o codigo
-- OTP antes de assinar quanto pra liberar o download do PDF depois de assinado.
-- Antes disso o limite so existia no navegador (facil de burlar recarregando a pagina);
-- agora o contador fica no banco, entao vale pra qualquer dispositivo/sessao.

alter table contratos add column if not exists document_check_attempts integer not null default 0;

-- Troca o retorno de boolean pra jsonb: alem de dizer se bateu, informa se ja travou (5
-- erros) e quantas tentativas restam, pro front mostrar isso pro cliente.
drop function if exists public.check_contrato_document_last_digits(uuid, text);

create or replace function public.check_contrato_document_last_digits(
  p_contract_id uuid,
  p_last_digits text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf_cnpj text;
  v_attempts integer;
  v_matched boolean;
begin
  -- FOR UPDATE trava a linha durante a checagem, pra duas tentativas simultaneas (ex: cliente
  -- clicando duas vezes rapido) nao lerem o mesmo contador desatualizado e "gastarem" so 1 tentativa.
  select cpf_cnpj, coalesce(document_check_attempts, 0)
    into v_cpf_cnpj, v_attempts
    from contratos
    where id = p_contract_id
    for update;

  if not found then
    return jsonb_build_object('matched', false, 'locked', false, 'attempts_remaining', 0);
  end if;

  if v_attempts >= 5 then
    return jsonb_build_object('matched', false, 'locked', true, 'attempts_remaining', 0);
  end if;

  v_matched := v_cpf_cnpj is not null
    and right(regexp_replace(v_cpf_cnpj, '\D', '', 'g'), 4) = p_last_digits;

  if v_matched then
    -- acertou: zera o contador (nao deixa "sobrar" tentativa gasta de tentativa anterior
    -- pra proxima vez que essa tela for aberta, ex: assinar e depois vir baixar o PDF)
    update contratos set document_check_attempts = 0 where id = p_contract_id;
    return jsonb_build_object('matched', true, 'locked', false, 'attempts_remaining', 5);
  else
    update contratos
      set document_check_attempts = v_attempts + 1
      where id = p_contract_id;
    return jsonb_build_object(
      'matched', false,
      'locked', (v_attempts + 1) >= 5,
      'attempts_remaining', greatest(0, 5 - (v_attempts + 1))
    );
  end if;
end;
$$;

-- Precisa poder ser chamada sem login (cliente acessa o link sem autenticacao),
-- mas so devolve o resultado da checagem -- nunca o cpf_cnpj em si.
grant execute on function public.check_contrato_document_last_digits(uuid, text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
