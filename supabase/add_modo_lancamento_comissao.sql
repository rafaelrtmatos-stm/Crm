-- Modo de lançamento de comissão por colaborador.
-- 'livre'        -> colaborador pode usar AMBOS os botões:
--                   1. "+ ADICIONAR SERVIÇO" (lançamento manual) — funciona hoje
--                   2. "+ PUXAR DE UMA NOTA" (aba Serviços) — nova opção
-- 'somente_nota' -> colaborador SÓ vê o botão "+ PUXAR DE UMA NOTA", o botão
--                   de lançamento manual fica oculto.
-- Configurável por colaborador em Comissões > Colaboradores (Admin). Default 'livre'.

ALTER TABLE colaboradores
ADD COLUMN IF NOT EXISTS modo_lancamento_comissao varchar DEFAULT 'livre';

ALTER TABLE colaboradores
DROP CONSTRAINT IF EXISTS colaboradores_modo_lancamento_comissao_check;

ALTER TABLE colaboradores
ADD CONSTRAINT colaboradores_modo_lancamento_comissao_check
CHECK (modo_lancamento_comissao IN ('livre', 'somente_nota'));

-- Notificar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
