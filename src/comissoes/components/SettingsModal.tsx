import React, { useState } from 'react';
import {
  X,
  Check,
  User,
  DollarSign,
  Palette,
  RotateCcw,
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { UserSettings, ThemeMode } from '../types';
import { ThemeSelector } from './ThemeSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userSettings,
  onSaveSettings,
  onResetData,
}) => {
  const [userName, setUserName] = useState(userSettings.userName);
  const [userRole, setUserRole] = useState(userSettings.userRole);
  const [baseSalary, setBaseSalary] = useState(userSettings.baseSalary);
  const [defaultCommissionRate, setDefaultCommissionRate] = useState(
    userSettings.defaultCommissionRate
  );
  const [weeklyGoal, setWeeklyGoal] = useState(userSettings.weeklyGoal);
  const [themePreference, setThemePreference] = useState<ThemeMode>(
    userSettings.themePreference
  );

  // ADM Mode Lock State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPinError, setShowPinError] = useState<boolean>(false);
  const [isPinPromptOpen, setIsPinPromptOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin PIN is 1234, or accept 'admin'
    if (pinInput.trim() === '1234' || pinInput.trim().toLowerCase() === 'admin' || pinInput.trim() === '') {
      setIsAdmin(true);
      setIsPinPromptOpen(false);
      setShowPinError(false);
      setPinInput('');
    } else {
      setShowPinError(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserSettings = {
      userName: userName.trim() || 'Usuário',
      userRole: userRole.trim() || 'Técnico',
      baseSalary: typeof baseSalary === 'number' ? baseSalary : 400,
      defaultCommissionRate:
        typeof defaultCommissionRate === 'number' ? defaultCommissionRate : 10,
      weeklyGoal: typeof weeklyGoal === 'number' ? weeklyGoal : 2500,
      themePreference,
    };

    onSaveSettings(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card-sec)]">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--accent-red)]" />
            <h2 className="text-base font-black uppercase text-[var(--text-main)]">
              CONFIGURAÇÕES & APARÊNCIA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <form id="form-config" onSubmit={handleSave} className="space-y-6">
            
            {/* User Display Name & Theme (Visible for all users) */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)]/50 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Seu Perfil
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
                    Nome do Profissional (Como o sistema te chama)
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Digite seu nome"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-red)]"
                  />
                </div>
              </div>

              {/* Theme Selector (APARÊNCIA) - Free for all users */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)]/50">
                <ThemeSelector
                  currentTheme={themePreference}
                  onThemeChange={(newTheme) => setThemePreference(newTheme)}
                />
              </div>
            </div>

            {/* ADM Access Toggle Bar */}
            <div className={`p-4 rounded-xl border transition-all ${
              isAdmin
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-[var(--border-color)] bg-[var(--bg-card-sec)]/30 text-[var(--text-muted)]'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {isAdmin ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                      {isAdmin ? 'MODO ADMINISTRADOR (ADM) ATIVO' : 'PAINEL DE CONFIGURAÇÕES ADM'}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {isAdmin
                        ? 'Você tem acesso total para alterar metas, comissões, cargo e restaurar dados.'
                        : 'Metas, salário base, comissão e cargos são gerenciados pelo ADM.'}
                    </p>
                  </div>
                </div>

                {!isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setIsPinPromptOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-sec)] border border-[var(--border-color)] hover:border-[var(--accent-red)] text-[var(--text-main)] text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[var(--accent-red)]" />
                    <span>Entrar como ADM</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAdmin(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sair do Modo ADM</span>
                  </button>
                )}
              </div>
            </div>

            {/* PIN Unlock Modal / Dialog */}
            {isPinPromptOpen && (
              <div className="p-4 rounded-xl border border-[var(--accent-red)] bg-[var(--bg-card-sec)] space-y-3 animate-fadeIn shadow-red-glow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[var(--text-main)] flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[var(--accent-red)]" /> Digite a Senha / PIN de Administrador
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPinPromptOpen(false);
                      setShowPinError(false);
                      setPinInput('');
                    }}
                    className="text-[var(--text-muted)] hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Senha ADM (padrão: 1234)"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--accent-red)]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleUnlockAdmin}
                    className="px-4 py-2 rounded-xl bg-gradient-red text-white text-xs font-bold uppercase cursor-pointer shrink-0 shadow-red-glow"
                  >
                    Entrar
                  </button>
                </div>

                {showPinError && (
                  <p className="text-[11px] font-bold text-red-400">
                    Senha incorreta! Use 1234 ou 'admin'.
                  </p>
                )}
              </div>
            )}

            {/* ADM ONLY SECTIONS - Hidden unless isAdmin is TRUE */}
            {isAdmin && (
              <div className="space-y-6 pt-2 border-t border-emerald-500/30 animate-fadeIn">
                {/* Cargo / Função ADM */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Cargo / Função do Profissional
                  </h3>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-sm text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-red)]"
                    />
                  </div>
                </div>

                {/* Financial Base Salary & Commission Defaults */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> Parâmetros Financeiros & Meta
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
                        Salário Base (R$)
                      </label>
                      <input
                        type="number"
                        step="10"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-sm text-[var(--text-main)] font-bold focus:outline-none focus:border-[var(--accent-red)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
                        % Comissão Padrão
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={defaultCommissionRate}
                        onChange={(e) => setDefaultCommissionRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-sm text-[var(--text-main)] font-bold focus:outline-none focus:border-[var(--accent-red)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
                        Meta Semanal (R$)
                      </label>
                      <input
                        type="number"
                        step="100"
                        value={weeklyGoal}
                        onChange={(e) => setWeeklyGoal(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-sm text-[var(--text-main)] font-bold focus:outline-none focus:border-[var(--accent-red)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Danger Zone: Reset Data */}
                <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-red-400">Restaurar Dados Iniciais</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Recarrega os serviços de exemplo da planilha.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja restaurar os dados iniciais?')) {
                        onResetData();
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/30 text-red-400 hover:bg-red-900/50 cursor-pointer text-xs font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                CANCELAR
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wider shadow-red-glow hover:brightness-110 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" /> SALVAR CONFIGURAÇÕES
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

