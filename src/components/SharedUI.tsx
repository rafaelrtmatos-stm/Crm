import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Search, Filter, ChevronRight, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatPhoneBR, formatCpfCnpj, validateCpfCnpj, looksLikeValidRG } from '../lib/validators';
import { fotoUsavel, marcarFotoQuebrada, AVATAR_PADRAO } from '../lib/foto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- BADGES ---
// Avatar com foto que cai para a inicial do nome quando a imagem falha ao
// carregar (ex.: fotos de perfil do WhatsApp cujas URLs assinadas expiram e
// passam a retornar 403). Sem isso, o <img> some (onError) mas o círculo
// fica vazio, pois a renderização da inicial só considerava photoUrl vazio,
// nunca o estado de erro de carregamento.
export const AvatarPhoto = ({ photoUrl, name, className, imgClassName, textClassName }: {
  photoUrl?: string | null;
  name?: string;
  className?: string;
  imgClassName?: string;
  textClassName?: string;
}) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [photoUrl]);
  // fotoUsavel descarta URL vazia, ja vencida (oe= do WhatsApp) ou que ja falhou nesta sessao: nem pede ao navegador.
  const src = failed ? null : fotoUsavel(photoUrl);
  const inicial = (name || '').trim().charAt(0).toUpperCase();
  return (
    <div className={cn('rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('w-full h-full object-cover', imgClassName)}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => { marcarFotoQuebrada(src); setFailed(true); }}
        />
      ) : inicial ? (
        <span className={cn('font-black text-slate-400', textClassName)}>{inicial}</span>
      ) : (
        <img src={AVATAR_PADRAO} alt="" className={cn('w-full h-full object-cover', imgClassName)} />
      )}
    </div>
  );
};

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
export const Input = ({ icon: Icon, label, className, onFocus, type, value, ...props }: any) => {
  const handleFocus = (e: any) => {
    // Em campos numericos, seleciona o conteudo ao focar — assim digitar ja substitui
    // o valor (ex: "0"), sem precisar apagar manualmente ou posicionar o cursor.
    if (type === 'number') {
      e.target.select();
    }
    onFocus?.(e);
  };

  // Garante que o input nunca alterne de uncontrolled para controlled quando value for undefined/null
  const inputValue = (props.onChange !== undefined || value !== undefined)
    ? (value === null || value === undefined ? '' : value)
    : undefined;

  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[10px] font-black uppercase tracking-[2px] text-white/40 ml-1">{label}</label>}
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary-400 transition-colors" size={18} />}
        <input
          type={type}
          value={inputValue}
          onFocus={handleFocus}
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
};

// --- TELEFONE (BR) ---
// Campo de telefone com bandeira do Brasil + "+55" fixo, formatando automaticamente
// enquanto digita (DDD e numero). O valor entregue via onChange e so o que a pessoa
// digitou (com a formatacao visual tipo "(93) 99211-2108"), sem o "+55" junto.
export const PhoneInputBR = ({ label, value, onChange, placeholder, className }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value);
    onChange(formatted);
  };
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[10px] font-black uppercase tracking-[2px] text-white/40 ml-1">{label}</label>}
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          <span className="text-base leading-none">🇧🇷</span>
          <span className="text-xs font-bold text-white/40">+55</span>
          <span className="w-px h-4 bg-white/10" />
        </div>
        <input
          type="tel"
          inputMode="numeric"
          value={value ?? ''}
          onChange={handleChange}
          placeholder={placeholder || '(93) 99999-9999'}
          className={cn(
            "w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-4 text-sm text-white placeholder:text-white/20 outline-none focus:bg-white/10 focus:border-primary-500/50 transition-all pl-[5.2rem]",
            className
          )}
        />
      </div>
    </div>
  );
};

// --- CPF/CNPJ (com validacao de digito verificador) ---
export const CpfCnpjInput = ({ label, value, onChange, className }: { label?: string; value: string; onChange: (v: string) => void; className?: string }) => {
  const safeVal = value ?? '';
  const digits = safeVal.replace(/\D/g, '');
  const completo = digits.length === 11 || digits.length === 14;
  const { valid } = validateCpfCnpj(safeVal);
  const mostrarErro = completo && !valid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatCpfCnpj(e.target.value));
  };

  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[10px] font-black uppercase tracking-[2px] text-white/40 ml-1">{label}</label>}
      <div className="relative group">
        <input
          type="text"
          inputMode="numeric"
          value={safeVal}
          onChange={handleChange}
          placeholder="000.000.000-00"
          className={cn(
            "w-full bg-white/5 border rounded-2xl py-3 px-4 text-sm text-white placeholder:text-white/20 outline-none transition-all",
            mostrarErro ? "border-rose-500/60 focus:border-rose-500" : "border-white/10 focus:bg-white/10 focus:border-primary-500/50",
            className
          )}
        />
      </div>
      {mostrarErro && (
        <p className="text-[9px] text-rose-400 font-bold ml-1">
          {digits.length === 11 ? 'CPF inválido — confira os números digitados.' : 'CNPJ inválido — confira os números digitados.'}
        </p>
      )}
    </div>
  );
};

// --- RG ---
// RG nao tem digito verificador padronizado nacionalmente (so SP usa um calculo proprio),
// entao aqui so avisa se o tamanho estiver bem fora do plausivel (a maioria dos estados
// usa entre 7 e 10 caracteres, contando o digito verificador quando existe)
export const RgInput = ({ label, value, onChange, className }: { label?: string; value: string; onChange: (v: string) => void; className?: string }) => {
  const safeVal = value ?? '';
  const clean = safeVal.replace(/[^\dXx.\-]/g, '');
  const mostrarErro = clean.length > 0 && !looksLikeValidRG(clean);

  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[10px] font-black uppercase tracking-[2px] text-white/40 ml-1">{label}</label>}
      <div className="relative group">
        <input
          type="text"
          value={safeVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder="00.000.000-0"
          className={cn(
            "w-full bg-white/5 border rounded-2xl py-3 px-4 text-sm text-white placeholder:text-white/20 outline-none transition-all",
            mostrarErro ? "border-rose-500/60 focus:border-rose-500" : "border-white/10 focus:bg-white/10 focus:border-primary-500/50",
            className
          )}
        />
      </div>
      {mostrarErro && (
        <p className="text-[9px] text-rose-400 font-bold ml-1">RG parece incompleto ou com tamanho incomum — confira os números.</p>
      )}
    </div>
  );
};

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
      <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase">
        {title}
      </h2>
      <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </header>
);

// --- MODAL ---
export const Modal = ({ isOpen, onClose, title, children, size = 'md', className, contentClassName }: any) => {
  const sizes: Record<string, string> = {
    compact: "max-w-[340px]",
    xs: "max-w-sm",
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
  };

  // Se className já especificar max-w, não aplica o sizes[size] padrão para não haver conflito de largura
  const hasCustomMaxWidth = className && (className.includes('max-w-') || className.includes('max-w-['));
  const sizeClass = hasCustomMaxWidth ? '' : (sizes[size] || sizes.md);

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
              sizeClass,
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

// --- LOGOS OFICIAIS DE CANAIS (WhatsApp & Instagram) ---
export const WhatsAppLogo = ({ className = "w-3.5 h-3.5", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
  </svg>
);

export const InstagramLogo = ({ className = "w-3.5 h-3.5", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const ChannelLogoBadge = ({
  channel,
  className = "w-3.5 h-3.5",
  title,
}: {
  channel?: string;
  className?: string;
  title?: string;
}) => {
  const c = (channel || 'WhatsApp').toLowerCase();
  const label = channel || 'WhatsApp';
  const displayTitle = title || label;

  if (c.includes('whats') || c.includes('wpp')) {
    return (
      <span className="inline-flex items-center justify-center shrink-0 text-emerald-400" title={displayTitle}>
        <WhatsAppLogo className={className} />
      </span>
    );
  }
  if (c.includes('insta')) {
    return (
      <span className="inline-flex items-center justify-center shrink-0 text-pink-400" title={displayTitle}>
        <InstagramLogo className={className} />
      </span>
    );
  }
  return (
    <span className="text-[8.5px] font-semibold tracking-wide text-white/50 shrink-0 truncate max-w-[60px]" title={displayTitle}>
      {label}
    </span>
  );
};

export const GoogleLogo = ({ className = "w-4 h-4", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 48 48"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
