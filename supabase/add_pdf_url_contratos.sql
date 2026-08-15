-- Rode esse script no SQL Editor do Supabase
-- Objetivo: parar de GERAR o PDF do contrato assinado toda vez que alguem clica em
-- "baixar" (jsPDF rodando no navegador com o texto/fonte/layout ATUAIS do codigo) e passar
-- a SALVAR UMA VEZ SO o PDF gerado no exato momento da assinatura, imutavel, no Supabase
-- Storage. O download a partir dai sempre puxa esse mesmo arquivo -- garante que o PDF
-- baixado daqui a 1 ano seja byte-a-byte o mesmo que o cliente assinou, mesmo que o layout/
-- fonte/logica de geracao do PDF no codigo mude no meio do caminho.
--
-- Compativel com o schema existente (create_contratos_table.sql, create_verification_codes_and_audit.sql)

-- =========================================================
-- 1) COLUNA COM O LINK DO PDF IMUTAVEL
-- =========================================================
-- Preenchida uma unica vez, dentro de signContract() (ver src/lib/otpUtils.ts), logo depois
-- que o contrato passa pra status='assinado'. Nunca e' sobrescrita depois -- uma nova
-- assinatura sempre acontece numa VERSAO NOVA do contrato (linha nova, id novo -- ver
-- "precisaNovaVersao" em Modules.tsx), entao esse campo nunca muda pra uma linha ja assinada.
alter table contratos add column if not exists pdf_url text;

-- =========================================================
-- 2) BUCKET NO SUPABASE STORAGE
-- =========================================================
-- Publico pra leitura: o link e' mandado por WhatsApp/E-mail pro cliente final abrir/baixar
-- sem estar logado no sistema (mesmo padrao ja usado pra tela publica /assinar/:id).
insert into storage.buckets (id, name, public)
values ('contratos-assinados', 'contratos-assinados', true)
on conflict (id) do nothing;

-- Leitura publica dos arquivos do bucket (necessario pro cliente final abrir o link recebido)
drop policy if exists "leitura publica contratos-assinados" on storage.objects;
create policy "leitura publica contratos-assinados"
  on storage.objects for select
  using (bucket_id = 'contratos-assinados');

-- Upload/atualizacao do arquivo -- feito pela chave anon/publishable, tanto na tela publica
-- de assinatura (cliente final) quanto no painel Admin. Mesmo padrao permissivo ja usado nas
-- outras tabelas do projeto (contratos, orcamentos, vendas, verification_codes): a protecao
-- real fica a cargo da logica da aplicacao (o campo so e' preenchido uma vez, no momento certo
-- do fluxo de assinatura), nao de RLS por usuario.
drop policy if exists "upload contratos-assinados" on storage.objects;
create policy "upload contratos-assinados"
  on storage.objects for insert
  with check (bucket_id = 'contratos-assinados');

drop policy if exists "update contratos-assinados" on storage.objects;
create policy "update contratos-assinados"
  on storage.objects for update
  using (bucket_id = 'contratos-assinados')
  with check (bucket_id = 'contratos-assinados');

NOTIFY pgrst, 'reload schema';
