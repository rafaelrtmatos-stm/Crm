import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  Save, 
  X,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { Company, AppUser } from '../types';

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl ${className}`}>
    {children}
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'; children: React.ReactNode }> = ({ children, className = '', variant = 'primary', ...props }) => {
  let baseClasses = "px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ";
  if (variant === 'primary') baseClasses += "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20";
  else if (variant === 'secondary') baseClasses += "bg-slate-800 hover:bg-slate-700 text-white";
  else if (variant === 'outline') baseClasses += "border border-white/10 hover:bg-white/5 text-slate-300";
  else if (variant === 'danger') baseClasses += "bg-rose-600 hover:bg-rose-500 text-white";
  else if (variant === 'ghost') baseClasses += "hover:bg-white/5 text-slate-300";
  return (
    <button className={`${baseClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Badge: React.FC<{ children: React.ReactNode; className?: string; variant?: string }> = ({ children, className = '' }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
    {children}
  </span>
);

export interface DespesaFixaItem {
  id: string;
  nome: string;
  categoria: 'instalacoes' | 'utilidades' | 'servicos' | 'software' | 'outros';
  valor: number;
  diaVencimento: number; // 1 a 31
  pagoEsteMes?: boolean;
  observacao?: string;
  dataAtualizacao?: string;
}

const STORAGE_KEY = 'rpro_despesas_fixas_list';

export const DEFAULT_DESPESAS_FIXAS: DespesaFixaItem[] = [
  { id: '1', nome: 'Aluguel & IPTU Comercial', categoria: 'instalacoes', valor: 2000.00, diaVencimento: 10, observacao: 'Ponto comercial principal' },
  { id: '2', nome: 'Energia Elétrica', categoria: 'utilidades', valor: 650.00, diaVencimento: 15, observacao: 'Consumo maquinários e iluminação' },
  { id: '3', nome: 'Água & Saneamento', categoria: 'utilidades', valor: 120.00, diaVencimento: 18, observacao: 'Taxa fixa e consumo' },
  { id: '4', nome: 'Internet Fibra Óptica & Telefonia', categoria: 'utilidades', valor: 180.00, diaVencimento: 5, observacao: 'Plano dedicado' },
  { id: '5', nome: 'Assessoria Contábil', categoria: 'servicos', valor: 450.00, diaVencimento: 20, observacao: 'Fechamento fiscal e folha' },
  { id: '6', nome: 'Sistemas & Licenças em Nuvem', categoria: 'software', valor: 150.00, diaVencimento: 1, observacao: 'Softwares e hospedagem' },
  { id: '7', nome: 'Limpeza, Manutenção & Insumos Gerais', categoria: 'instalacoes', valor: 250.00, diaVencimento: 25, observacao: 'Manutenção predial preventiva' },
];

export function getDespesasFixasTotalMensal(): number {
  if (typeof window === 'undefined') return 3800;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.reduce((acc: number, item: DespesaFixaItem) => acc + (Number(item.valor) || 0), 0);
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_DESPESAS_FIXAS.reduce((acc, item) => acc + item.valor, 0);
}

export const DespesasFixasModule: React.FC<{
  currentCompany: Company | null;
  user: AppUser | null;
}> = ({ currentCompany, user }) => {
  const [despesas, setDespesas] = useState<DespesaFixaItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_DESPESAS_FIXAS;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DespesaFixaItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<DespesaFixaItem['categoria']>('instalacoes');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [observacao, setObservacao] = useState('');

  // Salvar no localStorage e disparar evento global
  const saveDespesas = (novaLista: DespesaFixaItem[]) => {
    setDespesas(novaLista);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
      window.dispatchEvent(new CustomEvent('rpro-despesas-fixas-updated', {
        detail: { totalMensal: novaLista.reduce((acc, item) => acc + item.valor, 0) }
      }));
    }
  };

  const totalMensal = useMemo(() => {
    return despesas.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  }, [despesas]);

  const custoDiario = totalMensal / 30;
  const custoSemanal = custoDiario * 7;

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setNome('');
    setCategoria('instalacoes');
    setValor('');
    setDiaVencimento('10');
    setObservacao('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: DespesaFixaItem) => {
    setEditingItem(item);
    setNome(item.nome);
    setCategoria(item.categoria);
    setValor(item.valor.toString());
    setDiaVencimento(item.diaVencimento.toString());
    setObservacao(item.observacao || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const filtered = despesas.filter(d => d.id !== deleteId);
    saveDespesas(filtered);
    setDeleteId(null);
  };

  const handleTogglePago = (id: string) => {
    const updated = despesas.map(d => {
      if (d.id === id) {
        return { ...d, pagoEsteMes: !d.pagoEsteMes };
      }
      return d;
    });
    saveDespesas(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !valor) return;

    const valorNum = parseFloat(valor.replace(',', '.')) || 0;
    const diaNum = Math.min(31, Math.max(1, parseInt(diaVencimento) || 10));

    if (editingItem) {
      const updated = despesas.map(d => {
        if (d.id === editingItem.id) {
          return {
            ...d,
            nome: nome.trim(),
            categoria,
            valor: valorNum,
            diaVencimento: diaNum,
            observacao: observacao.trim(),
            dataAtualizacao: new Date().toISOString(),
          };
        }
        return d;
      });
      saveDespesas(updated);
    } else {
      const newItem: DespesaFixaItem = {
        id: Date.now().toString(),
        nome: nome.trim(),
        categoria,
        valor: valorNum,
        diaVencimento: diaNum,
        observacao: observacao.trim(),
        pagoEsteMes: false,
        dataAtualizacao: new Date().toISOString(),
      };
      saveDespesas([...despesas, newItem]);
    }

    setIsModalOpen(false);
  };

  const getCategoriaBadge = (cat: DespesaFixaItem['categoria']) => {
    switch (cat) {
      case 'instalacoes':
        return <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">Instalações</Badge>;
      case 'utilidades':
        return <Badge variant="outline" className="text-sky-400 border-sky-500/30 bg-sky-500/10">Luz / Água / Net</Badge>;
      case 'servicos':
        return <Badge variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10">Serviços / Contábil</Badge>;
      case 'software':
        return <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/10">Sistemas & Nuvem</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-500/30 bg-slate-500/10">Outros</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Métricas de Despesas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">Despesas Fixas</h1>
              <p className="text-xs text-white/50 font-bold uppercase tracking-wider">Custos operacionais mensais da empresa</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleOpenAddModal}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black gap-2 shadow-lg shadow-amber-500/20"
          >
            <Plus size={16} /> Nova Despesa Fixa
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 sm:p-5 border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Total Mensal</span>
            <DollarSign size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-white/40 mt-1 uppercase font-bold">Base para o cálculo do Ponto de Equilíbrio</p>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5 border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/60">Custo Fixo Diário</span>
            <Clock size={16} className="text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
            R$ {custoDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-white/40 mt-1 uppercase font-bold">Média por dia (base 30 dias)</p>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5 border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/60">Custo Fixo Semanal</span>
            <Calendar size={16} className="text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
            R$ {custoSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-white/40 mt-1 uppercase font-bold">Ciclo de apuração semanal da equipe</p>
        </GlassCard>
      </div>

      {/* Tabela de Despesas Fixas */}
      <GlassCard className="p-6 border-white/5 bg-white/[0.02] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Contas & Contratos Cadastrados</h3>
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase">{despesas.length} itens cadastrados</span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[9px] uppercase font-black tracking-wider text-white/40">
                <th className="py-3 px-3">Despesa / Conta</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Dia Vencimento</th>
                <th className="py-3 px-3">Valor Mensal</th>
                <th className="py-3 px-3">Status do Mês</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {despesas.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="py-3.5 px-3">
                    <p className="font-bold text-white text-sm">{item.nome}</p>
                    {item.observacao && (
                      <p className="text-[10px] text-white/40 font-medium">{item.observacao}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    {getCategoriaBadge(item.categoria)}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-white/80">
                    Todo dia {item.diaVencimento}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-black text-amber-400 text-sm">
                    R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3">
                    <button
                      onClick={() => handleTogglePago(item.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border"
                      style={{
                        backgroundColor: item.pagoEsteMes ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        borderColor: item.pagoEsteMes ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        color: item.pagoEsteMes ? '#34d399' : '#f87171',
                      }}
                    >
                      {item.pagoEsteMes ? (
                        <>
                          <CheckCircle2 size={12} /> Pago este mês
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} /> Pendente
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Editar Despesa"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Excluir Despesa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#131b2e] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                {editingItem ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-white/60 mb-1">
                  Nome da Conta / Despesa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel Galpão, Energia, Internet"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/60 mb-1">
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-white/60 mb-1">
                    Dia Vencimento (1 a 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={diaVencimento}
                    onChange={(e) => setDiaVencimento(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-white/60 mb-1">
                  Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="instalacoes">Instalações (Aluguel, IPTU, Condomínio)</option>
                  <option value="utilidades">Utilidades (Energia, Água, Internet, Gás)</option>
                  <option value="servicos">Serviços (Contabilidade, Limpeza, Segurança)</option>
                  <option value="software">Softwares & Sistemas (Licenças, Nuvem)</option>
                  <option value="outros">Outras Despesas Fixas</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-white/60 mb-1">
                  Observação / Detalhes (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Contrato com reajuste anual pelo IGPM"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black gap-1.5"
                >
                  <Save size={16} /> Salvar Despesa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#131b2e] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Excluir Despesa</h3>
                <p className="text-xs text-white/50">Tem certeza que deseja excluir esta despesa fixa?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setDeleteId(null)}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="danger"
                onClick={confirmDelete}
              >
                Sim, Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
