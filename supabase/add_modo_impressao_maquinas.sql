-- Rode esse script no SQL Editor do Supabase (já aplicado em produção em 02/09/2026)
-- Adiciona os campos de Modo de Impressão (Standard / High Speed) e Velocidade de Cabeça (mm/s)
-- usados para calcular automaticamente a Velocidade de Produção (m²/h) na tela de Máquinas.
--
-- Observação: as colunas de calibração real (calib_setup_min, calib_k_mms, velocidade_hispeed_m2h)
-- já existiam antes desta migration (ver add_velocidade_hispeed_maquinas.sql e
-- add_calibracao_cabeca_maquinas.sql aplicadas direto no projeto Supabase).
alter table public.maquinas
  add column if not exists modo_impressao text default 'standard',
  add column if not exists velocidade_cabeca_mms numeric(8,2) default 400;

comment on column public.maquinas.modo_impressao is 'Modo de impressão padrão da máquina: standard ou highspeed. Usado para calcular velocidade_producao_m2h automaticamente.';
comment on column public.maquinas.velocidade_cabeca_mms is 'Velocidade de cabeça padrão (mm/s, 250 a 761), usada no modo standard para calcular o tempo de produção.';

-- Preenche a máquina já calibrada com o modo/velocidade de cabeça usados no teste de calibração (400mm/s, standard)
update public.maquinas
set modo_impressao = 'standard',
    velocidade_cabeca_mms = 400
where nome = 'Impressora Roland Sp540V' and velocidade_cabeca_mms is null;

NOTIFY pgrst, 'reload schema';
