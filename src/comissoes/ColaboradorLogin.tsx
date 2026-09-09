import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { loginColaborador, Colaborador } from './utils/supabaseStorage';

export const ColaboradorLogin = ({ onLoginSuccess, embedded }: { onLoginSuccess: (colaborador: Colaborador) => void; embedded?: boolean }) => {
  const [nome, setNome] = useState(() => localStorage.getItem('rpro_colab_remember_nome') || '');
  const [senha, setSenha] = useState(() => localStorage.getItem('rpro_colab_remember_senha') || '');
  const [lembrar, setLembrar] = useState(() => localStorage.getItem('rpro_colab_remember_me') === 'true' || !!localStorage.getItem('rpro_colab_remember_nome'));
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !senha.trim()) { setErro('Preencha nome e senha.'); return; }
    setErro('');
    setLoading(true);
    const colaborador = await loginColaborador(nome, senha);
    setLoading(false);
    if (!colaborador) { setErro('Nome ou senha incorretos.'); return; }

    if (lembrar) {
      localStorage.setItem('rpro_colab_remember_me', 'true');
      localStorage.setItem('rpro_colab_remember_nome', nome.trim());
      localStorage.setItem('rpro_colab_remember_senha', senha.trim());
    } else {
      localStorage.removeItem('rpro_colab_remember_me');
      localStorage.removeItem('rpro_colab_remember_nome');
      localStorage.removeItem('rpro_colab_remember_senha');
    }

    onLoginSuccess(colaborador);
  };

  return (
    <div className={`comissoes-app ${embedded ? 'h-full min-h-[420px]' : 'min-h-screen'} flex items-center justify-center p-4`}>
      <form onSubmit={handleSubmit} className="w-full max-w-[360px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-red-lg-glow flex flex-col items-center space-y-4">
        <div className="text-center space-y-1">
          <div className="w-14 h-14 mx-auto rounded-2xl overflow-hidden mb-2 p-1.5 bg-white/[0.04] border border-white/10">
            <img src="/icon-192.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-sm font-black uppercase tracking-wider text-[var(--text-main)]">Painel de Comissões</h1>
          <p className="text-xs text-[var(--text-muted)]">Entre com seu usuário e senha</p>
        </div>

        <div className="w-full space-y-3.5 pt-1">
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl pl-10 pr-3.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)]"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl pl-10 pr-3.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)]"
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setLembrar(checked);
                  if (!checked) {
                    localStorage.removeItem('rpro_colab_remember_me');
                    localStorage.removeItem('rpro_colab_remember_nome');
                    localStorage.removeItem('rpro_colab_remember_senha');
                  }
                }}
                className="w-3.5 h-3.5 rounded border-white/20 bg-[var(--bg-card-sec)] accent-red-600 cursor-pointer"
              />
              <span className="text-[11px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                Lembrar login e senha
              </span>
            </label>
            <span className="text-[10px] text-[var(--text-muted)]">Neste aparelho</span>
          </div>

          {erro && <p className="text-xs text-[var(--accent-red)] font-bold text-center">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wider shadow-red-glow hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </div>
      </form>
    </div>
  );
};
