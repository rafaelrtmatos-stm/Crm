import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { ThemeMode } from '../types';

interface ThemeSelectorProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold tracking-wider uppercase text-[var(--text-muted)]">
        Aparência
      </label>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onThemeChange('dark')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
            currentTheme === 'dark'
              ? 'border-[var(--accent-red)] bg-red-950/20 text-white shadow-sm'
              : 'border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white'
          }`}
        >
          <Moon className={`w-5 h-5 mb-1.5 ${currentTheme === 'dark' ? 'text-[var(--accent-red)]' : ''}`} />
          <span className="text-xs font-medium">Escuro</span>
        </button>

        <button
          type="button"
          onClick={() => onThemeChange('light')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
            currentTheme === 'light'
              ? 'border-[var(--accent-red)] bg-red-500/10 text-[var(--text-main)] shadow-sm'
              : 'border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Sun className={`w-5 h-5 mb-1.5 ${currentTheme === 'light' ? 'text-[var(--accent-red)]' : ''}`} />
          <span className="text-xs font-medium">Claro</span>
        </button>

        <button
          type="button"
          onClick={() => onThemeChange('auto')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
            currentTheme === 'auto'
              ? 'border-[var(--accent-red)] bg-red-950/20 text-[var(--text-main)] shadow-sm'
              : 'border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Monitor className={`w-5 h-5 mb-1.5 ${currentTheme === 'auto' ? 'text-[var(--accent-red)]' : ''}`} />
          <span className="text-xs font-medium">Automático</span>
        </button>
      </div>
    </div>
  );
};
