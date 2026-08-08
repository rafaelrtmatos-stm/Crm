-- Rode esse script no SQL Editor do Supabase
-- Registro formal de pagamento posterior autorizado (excecao ao prazo padrao de pagamento)
alter table orcamentos add column if not exists pagamento_posterior_autorizado boolean default false;
alter table orcamentos add column if not exists pagamento_posterior_data date;
alter table orcamentos add column if not exists pagamento_posterior_dias integer;
alter table orcamentos add column if not exists pagamento_posterior_condicao text;
alter table orcamentos add column if not exists pagamento_posterior_responsavel text;
