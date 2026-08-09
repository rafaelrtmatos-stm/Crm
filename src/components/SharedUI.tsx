import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Search, Filter, ChevronRight, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- BADGES ---
export const Badge = ({ children, variant = 'default', className, ...props }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  className?: string;
  [key: string]: any;
}) => {
  const variants = {
    default: 'bg-white/10 text-white/70 border-white/10',
    primary: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    error: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    outline: 'bg-transparent text-white/60 border-white/10',
  };

  return (
    <span 
      className={cn(
        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-[1.5px] border",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// --- CARDS ---
export const GlassCard = ({ children, className, hover = true, ...props }: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
  [key: string]: any;
}) => (
  <div 
    className={cn(
      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl transition-all duration-300",
      hover && "hover:bg-white/10 hover:border-white/20",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// --- INPUTS ---
export const Input = ({ icon: Icon, label, className, ...props }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-[10px] font-black uppercase tracking-[2px] text-white/40 ml-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary-400 transition-colors" size={18} />}
      <input
        className={cn(
          "w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-white/20 outline-none focus:bg-white/10 focus:border-primary-500/50 transition-all",
          Icon && "pl-12",
          className
        )}
        {...props}
      />
    </div>
  </div>
);

// --- TABLES ---
export const DataTable = ({ columns, data, loading }: any) => {
  if (loading) return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl w-full" />
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile: cards empilhados (sem rolagem lateral) */}
      <div className="sm:hidden space-y-3">
        {data.map((row: any, i: number) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            key={row.id || i}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2.5"
          >
            {columns.map((col: any) => (
              <div key={col.key} className="flex items-start justify-between gap-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/30 shrink-0 pt-0.5">{col.label}</span>
                <div className="text-sm font-medium text-white/80 text-right min-w-0">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </div>
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      {/* Desktop/tablet: tabela normal */}
      <div className="hidden sm:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-y-3">
          <thead>
            <tr>
              {columns.map((col: any) => (
                <th key={col.key} className="px-6 py-2 text-[10px] font-black uppercase tracking-[2px] text-white/30">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={row.id || i}
                className="bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all group cursor-pointer border-t border-white/5 first:border-t-0"
              >
                {columns.map((col: any) => (
                  <td key={col.key} className="px-6 py-4 text-sm font-medium text-white/80 group-hover:text-white transition-colors border-y border-white/5 first:border-l first:rounded-l-2xl last:border-r last:rounded-r-2xl">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// --- BUTTONS ---
export const Button = ({ children, variant = 'primary', className, icon: Icon, ...props }: any) => {
  const variants = {
    primary: "bg-primary-500 text-white shadow-[0_0_20px_rgba(76,201,240,0.3)] hover:bg-primary-400 hover:shadow-primary-400/40 focus:ring-primary-500/50",
    secondary: "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 focus:ring-white/20",
    danger: "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:bg-rose-400 focus:ring-rose-500/50",
    ghost: "bg-transparent text-white/50 hover:bg-white/5 hover:text-white transition-all",
  };

  return (
    <button
      className={cn(
        "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[1.5px] transition-all active:scale-95 flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] outline-none disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- SECTION HEADER ---
export const SectionHeader = ({ title, subtitle, actions }: any) => (
  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
    <div>
      <h2 className="text-3xl font-extralight text-white tracking-tight">
        {title ? title.split(' ').map((word: string, i: number) => 
          i === 1 ? <span key={i} className="font-bold text-primary-300 pl-1">{word} </span> : word + ' '
        ) : null}
      </h2>
      <p className="text-white/40 text-[10px] font-black uppercase tracking-[2px] mt-1">{subtitle}</p>
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </header>
);

// --- MODAL ---
export const Modal = ({ isOpen, onClose, title, children, size = 'md', className, contentClassName }: any) => {
  const sizes: Record<string, string> = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className={cn(
              "relative w-full max-h-[98vh] h-auto bg-[#1a2333]/95 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-[32px] shadow-2xl flex flex-col p-3 sm:p-5 md:p-6 transition-all duration-300 overflow-hidden my-auto",
              sizes[size] || sizes.md,
              className
            )}
          >
          <div className="flex items-center justify-between mb-2 sm:mb-4 shrink-0 border-b border-white/5 pb-2 sm:pb-3">
            <h3 className="text-sm sm:text-lg md:text-xl font-black text-white tracking-tight truncate uppercase">{title}</h3>
            <button onClick={onClose} className="p-1 sm:p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg sm:rounded-xl transition-all cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className={cn("flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar", contentClassName)}>
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
};

// --- DRAWER ---
export const Drawer = ({ isOpen, onClose, title, children }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xl h-full bg-[#1a2333]/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>
          <div className="h-[calc(100%-4rem)] overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- ERROR BOUNDARIES (proteção contra tela em branco/travada) ---
type ModuleErrorBoundaryProps = { children: React.ReactNode; label?: string };
type ModuleErrorBoundaryState = { hasError: boolean; message: string; stack: string };
/**
 * Barreira de erro para um modulo inteiro (ex: PDV). Se algo travar durante
 * a renderizacao, mostra a mensagem do erro na tela em vez de deixar a
 * pagina inteira preta/em branco sem explicacao nenhuma.
 */
export class ModuleErrorBoundary extends React.Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  declare props: ModuleErrorBoundaryProps;
  state: ModuleErrorBoundaryState = { hasError: false, message: '', stack: '' };
  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && error.stack ? error.stack : '',
    };
  }
  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error('ModuleErrorBoundary capturou um erro:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-center p-8">
          <div className="text-red-400 font-bold text-sm">
            Não foi possível carregar {this.props.label || 'esta tela'}.
          </div>
          <div className="text-white/40 text-xs max-w-md font-mono break-words">
            {this.state.message}
          </div>
          {this.state.stack && (
            <div className="text-white/30 text-[9px] max-w-lg text-left font-mono whitespace-pre-wrap break-words bg-black/30 rounded-lg p-3 max-h-48 overflow-y-auto">
              {this.state.stack}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-all"
          >
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Barreira de erro menor, para envolver so um grafico (ex: recharts ResponsiveContainer),
 * sem derrubar a tela inteira se so o grafico falhar durante uma troca de aba. */
export class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  declare props: { children: React.ReactNode };
  state: { hasError: boolean } = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.error('ChartErrorBoundary capturou um erro:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">Gráfico indisponível</div>;
    }
    return this.props.children;
  }
}
