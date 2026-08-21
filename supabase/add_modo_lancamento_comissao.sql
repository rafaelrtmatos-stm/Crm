-- Modo de lançamento de comissão por colaborador. Há um único botão
-- "+ ADICIONAR SERVIÇO" -- o que muda é pra onde ele leva o colaborador:
-- 'livre'        -> abre o lançamento manual (pode adicionar serviço sem vincular a nota).
-- 'somente_nota' -> manda direto pra aba Serviços, pra puxar itens de uma nota
--                   (só pode adicionar serviço vinculado a uma nota).
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
