import React, { useState } from 'react';
import { LogIn, User, Lock } from 'lucide-react';
import { loginColaborador, Colaborador } from './utils/supabaseStorage';

export const ColaboradorLogin = ({ onLoginSuccess }: { onLoginSuccess: (colaborador: Colaborador) => void }) => {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
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
    onLoginSuccess(colaborador);
  };

  return (
    <div className="comissoes-app min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 shadow-red-lg-glow space-y-6">
        <div className="text-center space-y-1">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-red flex items-center justify-center mb-3">
            <LogIn className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight">Comissões</h1>
          <p className="text-xs text-[var(--text-muted)]">Entre com seu nome e senha</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl pl-10 pr-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)]"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl pl-10 pr-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)]"
            />
          </div>
        </div>

        {erro && <p className="text-xs text-[var(--accent-red)] font-bold text-center">{erro}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-gradient-red text-white text-sm font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
