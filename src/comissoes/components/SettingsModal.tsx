import React, { useState } from 'react';
import {
  X,
  Check,
  User,
  Palette,
} from 'lucide-react';
import { UserSettings, ThemeMode } from '../types';
import { ThemeSelector } from './ThemeSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSettings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  // Quando o painel esta embutido dentro do CRM, o tema claro/escuro ja segue
  // o tema geral do sistema (nao e mais escolhido por colaborador aqui), entao
  // escondemos essa opcao pra nao confundir.
  hideThemeOption?: boolean;
}

// Cargo, salario base, % de comissao padrao e meta semanal sao geridos
// SOMENTE pelo admin de verdade, na tela de gerenciamento de colaboradores
// dentro do CRM (ComissoesAdminPanel.tsx) — nao existe mais um "modo ADM"
// aqui dentro, protegido por PIN, pra evitar que o proprio colaborador
// altere esses valores.
export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userSettings,
  onSaveSettings,
  hideThemeOption,
}) => {
  const [userName, setUserName] = useState(userSettings.userName);
  const [themePreference, setThemePreference] = useState<ThemeMode>(
    userSettings.themePreference
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserSettings = {
      ...userSettings,
      userName: userName.trim() || 'Usuário',
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

              {/* Theme Selector (APARÊNCIA) - escondido quando embutido no CRM,
                  que ja controla o tema claro/escuro globalmente */}
              {!hideThemeOption && (
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)]/50">
                  <ThemeSelector
                    currentTheme={themePreference}
                    onThemeChange={(newTheme) => setThemePreference(newTheme)}
                  />
                </div>
              )}
            </div>

            <p className="text-[10px] text-[var(--text-muted)]">
              Cargo, salário base, % de comissão e meta semanal são definidos pelo administrador.
            </p>

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
