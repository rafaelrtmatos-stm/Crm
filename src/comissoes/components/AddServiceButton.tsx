import React from 'react';
import { Plus } from 'lucide-react';

interface AddServiceButtonProps {
  onClick: () => void;
  fullWidth?: boolean;
  size?: 'normal' | 'large';
  className?: string;
}

export const AddServiceButton: React.FC<AddServiceButtonProps> = ({
  onClick,
  fullWidth = false,
  size = 'normal',
  className = '',
}) => {
  return (
    <button
      id="btn-adicionar-servico"
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center gap-2.5 rounded-xl font-bold text-white bg-gradient-red shadow-red-glow hover:shadow-red-lg-glow transition-all duration-200 active:scale-95 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:ring-offset-2 focus:ring-offset-[var(--bg-main)] cursor-pointer ${
        size === 'large' ? 'px-6 py-4 text-base min-h-[52px]' : 'px-5 py-3 text-sm min-h-[44px]'
      } ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 text-white group-hover:scale-110 transition-transform">
        <Plus className="w-4 h-4 stroke-[3]" />
      </div>
      <span className="tracking-wide uppercase font-extrabold text-sm">+ ADICIONAR SERVIÇO</span>
    </button>
  );
};
