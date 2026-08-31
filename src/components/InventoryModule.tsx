import React, { useState, useEffect } from 'react';
import { 
  Box, Plus, Search, Filter, AlertTriangle, Edit2, Trash2, 
  Layers, Calculator, Download, Upload, RefreshCw, Check, X,
  DollarSign, PackageCheck, Wrench, Sparkles, Sliders
} from 'lucide-react';
import { Company, AppUser, Product, MateriaPrima, MateriaPrimaConsumo } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { Badge, Button, Modal } from './SharedUI';
import { fetchMateriasPrimas } from '../lib/materiasPrimasStorage';
import { MateriaPrimaFormModal } from './MateriasPrimasModule';
import * as XLSX from 'xlsx';

interface InventoryModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ currentCompany, user }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [materiasPrimasList, setMateriasPrimasList] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    price: 0,
    cost_price: 0,
    stock: 0,
    min_stock: 5,
    unit_type: 'unit' as 'unit' | 'm2' | 'etiqueta' | 'metro',
    tipo_item: 'produto' as 'produto' | 'material' | 'servico' | 'acabamento' | 'composto',
    largura_rolo: 0,
    comprimento_rolo: 0,
    valor_minimo: 0,
    controla_estoque: true,
    category: 'Geral',
    provider: '',
    materias_primas: [] as MateriaPrimaConsumo[]
  });

  // Selected materia prima to add in modal
  const [selectedMateriaPrimaId, setSelectedMateriaPrimaId] = useState<string>('');
  const [rawMaterialConsumedQty, setRawMaterialConsumedQty] = useState<number>(1);
  const [calcLarguraCm, setCalcLarguraCm] = useState<number>(0);
  const [calcAlturaCm, setCalcAlturaCm] = useState<number>(0);
  const [calcModoAvulso, setCalcModoAvulso] = useState<boolean>(true);
  const [autoSyncCost, setAutoSyncCost] = useState<boolean>(true);

  // Quick Raw Material Modal (Add/Edit on the fly)
  const [isMpModalOpen, setIsMpModalOpen] = useState<boolean>(false);
  const [editingMpItem, setEditingMpItem] = useState<MateriaPrima | null>(null);

  useEffect(() => {
    fetchProducts();
    loadAvailableMateriasPrimas();
  }, [currentCompany]);

  const loadAvailableMateriasPrimas = async () => {
    try {
      const data = await fetchMateriasPrimas(currentCompany?.id);
      setMateriasPrimasList(data.filter(m => m.isActive));
    } catch (e) {
      console.warn('Erro ao carregar matérias-primas:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase.from('produtos').select('*').order('name', { ascending: true });
      if (currentCompany?.id) {
        query = query.or(`company_id.eq.${currentCompany.id},company_id.is.null`);
      }
      let { data, error } = await query;
      if (error) {
        // Fallback without order
        const fallback = await supabase.from('produtos').select('*');
        data = fallback.data;
      }
      const mapped = (data || []).map((p: any) => {
        const rawUnit = p.unit || p.unidade || p.unit_type || 'unit';
        const normalizedUnit = (rawUnit === 'm2' || rawUnit === 'metro' || rawUnit === 'm') ? 'metro' : rawUnit;
        return {
          id: p.id,
          name: p.name || p.nome || 'Produto',
          code: p.code || p.codigo || '',
          price: Number(p.sale_price ?? p.preco ?? p.price ?? 0),
          costPrice: Number(p.cost_price ?? p.preco_custo ?? 0),
          stock: Number(p.current_stock ?? p.estoque ?? p.stock ?? 0),
          minStock: Number(p.min_stock ?? p.estoque_minimo ?? 0),
          unitType: normalizedUnit,
          tipoItem: p.tipo_item || 'produto',
          larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
          comprimentoRolo: p.comprimento_rolo ? Number(p.comprimento_rolo) : undefined,
          valorMinimo: p.valor_minimo ? Number(p.valor_minimo) : undefined,
          controlaEstoque: p.controla_estoque ?? true,
          category: p.category || p.categoria || 'Geral',
          provider: p.provider || p.fornecedor || '',
          materiasPrimas: p.materias_primas || p.materiasPrimas || []
        };
      });
      setProducts(mapped);
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (prod?: any) => {
    loadAvailableMateriasPrimas();
    setSelectedMateriaPrimaId('');
    setRawMaterialConsumedQty(1);
    if (prod) {
      setEditingProduct(prod);
      const normalizedUnit = (prod.unitType === 'etiqueta' || prod.unit === 'etiqueta') 
        ? 'etiqueta' 
        : (prod.unitType === 'metro' || prod.unitType === 'm' || prod.unitType === 'm2' || prod.unit === 'm' || prod.unit === 'm2')
        ? 'metro'
        : 'unit';

      setFormData({
        name: prod.name || '',
        code: prod.code || '',
        price: prod.price || 0,
        cost_price: prod.costPrice || 0,
        stock: prod.stock || 0,
        min_stock: prod.minStock || 5,
        unit_type: normalizedUnit,
        tipo_item: prod.tipoItem || 'produto',
        largura_rolo: prod.larguraRolo || 0,
        comprimento_rolo: prod.comprimentoRolo || 0,
        valor_minimo: prod.valorMinimo || 0,
        controla_estoque: prod.controlaEstoque ?? true,
        category: prod.category || 'Geral',
        provider: prod.provider || '',
        materias_primas: Array.isArray(prod.materiasPrimas) ? [...prod.materiasPrimas] : []
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        code: `COD-${Math.floor(1000 + Math.random() * 9000)}`,
        price: 0,
        cost_price: 0,
        stock: 10,
        min_stock: 5,
        unit_type: 'unit',
        tipo_item: 'produto',
        largura_rolo: 0,
        comprimento_rolo: 0,
        valor_minimo: 0,
        controla_estoque: true,
        category: 'Geral',
        provider: '',
        materias_primas: []
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenCreateMp = () => {
    setEditingMpItem(null);
    setIsMpModalOpen(true);
  };

  const handleOpenEditMp = () => {
    if (!selectedMateriaPrimaId) {
      showAlert('Selecione uma matéria-prima na lista para editar.');
      return;
    }
    const mp = materiasPrimasList.find(m => m.id === selectedMateriaPrimaId);
    if (!mp) return;
    setEditingMpItem(mp);
    setIsMpModalOpen(true);
  };

  const handleSavedMp = (saved: MateriaPrima) => {
    setMateriasPrimasList(prev => {
      const idx = prev.findIndex(m => m.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    setSelectedMateriaPrimaId(saved.id);

    // If this raw material is already used in the product, update its costPrice and recalculate
    if (formData.materias_primas.some(m => m.materiaPrimaId === saved.id)) {
      const updatedMaterials = formData.materias_primas.map(item => {
        if (item.materiaPrimaId === saved.id) {
          return {
            ...item,
            name: saved.name,
            unit: saved.unit,
            costPrice: saved.costPrice
          };
        }
        return item;
      });

      const nextTotalCost = updatedMaterials.reduce((acc, item) => acc + ((item.costPrice || 0) * (item.quantity || 0)), 0);

      setFormData(prev => ({
        ...prev,
        materias_primas: updatedMaterials,
        cost_price: autoSyncCost ? Number(nextTotalCost.toFixed(2)) : prev.cost_price
      }));
    }
  };

  const handleAddMateriaPrimaToProduct = () => {
    if (!selectedMateriaPrimaId) {
      showAlert('Selecione uma matéria-prima.');
      return;
    }
    const mp = materiasPrimasList.find(m => m.id === selectedMateriaPrimaId);
    if (!mp) return;

    if (rawMaterialConsumedQty <= 0) {
      showAlert('Informe uma quantidade válida.');
      return;
    }

    let updatedMaterials: MateriaPrimaConsumo[] = [];
    const existsIndex = formData.materias_primas.findIndex(item => item.materiaPrimaId === mp.id);
    if (existsIndex >= 0) {
      updatedMaterials = [...formData.materias_primas];
      updatedMaterials[existsIndex].quantity = rawMaterialConsumedQty;
      updatedMaterials[existsIndex].costPrice = mp.costPrice;
    } else {
      const newItem: MateriaPrimaConsumo = {
        materiaPrimaId: mp.id,
        name: mp.name,
        unit: mp.unit,
        quantity: rawMaterialConsumedQty,
        costPrice: mp.costPrice
      };
      updatedMaterials = [...formData.materias_primas, newItem];
    }

    const nextTotalCost = updatedMaterials.reduce((acc, item) => acc + ((item.costPrice || 0) * (item.quantity || 0)), 0);

    setFormData({
      ...formData,
      materias_primas: updatedMaterials,
      cost_price: autoSyncCost ? Number(nextTotalCost.toFixed(2)) : formData.cost_price
    });

    setSelectedMateriaPrimaId('');
    setRawMaterialConsumedQty(1);
  };

  const handleRemoveMateriaPrima = (index: number) => {
    const nextMaterials = formData.materias_primas.filter((_, i) => i !== index);
    const nextTotalCost = nextMaterials.reduce((acc, item) => acc + ((item.costPrice || 0) * (item.quantity || 0)), 0);

    setFormData({
      ...formData,
      materias_primas: nextMaterials,
      cost_price: autoSyncCost ? Number(nextTotalCost.toFixed(2)) : formData.cost_price
    });
  };

  const calculateTotalMateriasPrimasCost = () => {
    return formData.materias_primas.reduce((acc, item) => {
      return acc + ((item.costPrice || 0) * (item.quantity || 0));
    }, 0);
  };

  const handleApplyMateriasPrimasCost = () => {
    const totalCost = calculateTotalMateriasPrimasCost();
    setFormData({ ...formData, cost_price: Number(totalCost.toFixed(2)) });
    showAlert(`Preço de custo atualizado para R$ ${totalCost.toFixed(2)}.`);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('Informe o nome do item.');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        nome: formData.name.trim(),
        codigo: formData.code.trim() || null,
        preco: Number(formData.price) || 0,
        preco_custo: Number(formData.cost_price) || 0,
        estoque: Number(formData.stock) || 0,
        estoque_minimo: Number(formData.min_stock) || 0,
        unidade: formData.unit_type,
        tipo_item: formData.tipo_item,
        largura_rolo: formData.largura_rolo ? Number(formData.largura_rolo) : null,
        comprimento_rolo: formData.comprimento_rolo ? Number(formData.comprimento_rolo) : null,
        valor_minimo: formData.valor_minimo ? Number(formData.valor_minimo) : null,
        controla_estoque: formData.controla_estoque,
        categoria: formData.category || 'Geral',
        fornecedor: formData.provider || null,
        company_id: currentCompany?.id || null,
        materias_primas: formData.materias_primas || [],
        updated_at: new Date().toISOString()
      };

      if (editingProduct) {
        let { error } = await supabase
          .from('produtos')
          .update(payload)
          .eq('id', editingProduct.id);
        
        if (error && error.message?.includes('materias_primas')) {
          // If column doesn't exist yet, retry without it
          const { materias_primas, ...restPayload } = payload;
          const fallbackRes = await supabase.from('produtos').update(restPayload).eq('id', editingProduct.id);
          if (fallbackRes.error) throw fallbackRes.error;
        } else if (error) {
          throw error;
        }
        showAlert('Item atualizado com sucesso!');
      } else {
        payload.created_at = new Date().toISOString();
        let { error } = await supabase
          .from('produtos')
          .insert([payload]);
        
        if (error && error.message?.includes('materias_primas')) {
          const { materias_primas, ...restPayload } = payload;
          const fallbackRes = await supabase.from('produtos').insert([restPayload]);
          if (fallbackRes.error) throw fallbackRes.error;
        } else if (error) {
          throw error;
        }
        showAlert('Item cadastrado com sucesso!');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      showAlert(`Erro ao salvar: ${err.message || 'Falha na gravação'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product: any) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${product.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', product.id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== product.id));
      showAlert('Item excluído com sucesso.');
    } catch (err: any) {
      console.error('Erro ao excluir produto:', err);
      showAlert('Erro ao excluir item.');
    }
  };

  const handleStockAdjust = async (product: any, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ estoque: newStock })
        .eq('id', product.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
    } catch (err) {
      console.error('Erro ao ajustar estoque:', err);
    }
  };

  const handleExportExcel = () => {
    if (products.length === 0) {
      showAlert('Nenhum item para exportar.');
      return;
    }
    const dataToExport = products.map(p => ({
      'Código': p.code,
      'Descrição': p.name,
      'Tipo': p.tipoItem,
      'Unidade': p.unitType,
      'Preço Venda (R$)': p.price.toFixed(2),
      'Custo Interno (R$)': p.costPrice.toFixed(2),
      'Estoque Atual': p.stock,
      'Estoque Mínimo': p.minStock,
      'Categoria': p.category
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos_Insumos');
    XLSX.writeFile(wb, `Estoque_${currentCompany?.shortName || 'RafaArts'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredProducts = products.filter(p => {
    const matchType = selectedType === 'all' || p.tipoItem === selectedType;
    const term = search.toLowerCase();
    const matchSearch = 
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term);
    return matchType && matchSearch;
  });

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Box className="text-primary-400" size={24} />
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
              Estoque de Produtos & Insumos Gráficos
            </h2>
          </div>
          <p className="text-xs text-white/50">
            Cadastre materiais (lonas, vinil, ACM), produtos acabados, serviços e precificação por m².
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="text-[10px] py-2 px-3 sm:px-4"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

          <Button
            onClick={() => handleOpenAddModal()}
            className="text-[10px] py-2 px-4 bg-primary-500 hover:bg-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20"
          >
            <Plus size={16} />
            <span>Novo Item</span>
          </Button>
        </div>
      </div>

      {/* Critical Stock Warning */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-400 shrink-0" size={20} />
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Alerta de Reposição ({lowStockCount} {lowStockCount === 1 ? 'item' : 'itens'} no estoque mínimo)
              </p>
              <p className="text-[11px] text-zinc-300">
                Itens com estoque baixo continuam liberados para venda sem bloqueio operacional.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 flex-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'produto', label: 'Produtos Prontos' },
            { id: 'material', label: 'Matéria-Prima / Insumos' },
            { id: 'servico', label: 'Serviços' },
            { id: 'acabamento', label: 'Acabamentos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                selectedType === tab.id
                  ? 'bg-primary-500 text-slate-900 border-primary-400 shadow-md shadow-primary-500/20'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, código..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 text-xs text-white placeholder:text-white/30 outline-none focus:bg-white/10 focus:border-primary-500/50 transition-all"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-12 text-center text-white/40">Carregando estoque...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center space-y-3">
          <Box className="mx-auto text-white/20" size={40} />
          <p className="text-sm font-bold text-white/60">Nenhum item cadastrado nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => {
            const isLowStock = product.stock <= product.minStock;

            return (
              <div
                key={product.id}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/60">
                          {product.code || 'S/CÓD'}
                        </span>
                        <span className="text-[9px] font-bold uppercase bg-primary-500/10 text-primary-300 border border-primary-500/20 px-2 py-0.5 rounded">
                          {product.unitType === 'm2' ? 'm²' : product.unitType === 'metro' ? 'Metro Linear' : product.unitType === 'etiqueta' ? 'Etiqueta' : 'Unidade'}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                        {product.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-black text-white font-mono">
                        R$ {product.price.toFixed(2)}
                      </p>
                      {product.costPrice > 0 && (
                        <p className="text-[9px] text-white/40 font-mono italic">
                          Custo: R$ {product.costPrice.toFixed(2)}
                        </p>
                      )}
                      {product.materiasPrimas && product.materiasPrimas.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-primary-400 font-bold bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-500/20 mt-0.5">
                          <Layers size={9} />
                          {product.materiasPrimas.length} Matéria{product.materiasPrimas.length > 1 ? 's' : ''}-Prima
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock & Details */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 uppercase font-bold text-[10px]">Estoque:</span>
                      <span className={`font-mono font-bold ${isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {product.stock} {product.unitType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStockAdjust(product, -1)}
                        className="w-6 h-6 bg-white/5 hover:bg-white/15 text-white/70 rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleStockAdjust(product, 1)}
                        className="w-6 h-6 bg-white/5 hover:bg-white/15 text-white/70 rounded-lg flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-1">
                  <span className="text-[10px] text-white/40 font-bold uppercase">
                    {product.category}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenAddModal(product)}
                      className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                      title="Editar item"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product)}
                      className="p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Excluir item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editar Item' : 'Novo Item / Insumo'}
        size="md"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Nome do Produto / Material / Serviço *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Lona Frontlight 440g / Banner com Ilhós"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Código / SKU
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Tipo do Item
              </label>
              <select
                value={formData.tipo_item}
                onChange={e => setFormData({ ...formData, tipo_item: e.target.value as any })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              >
                <option value="produto">Produto Acabado</option>
                <option value="material">Matéria-Prima / Insumo</option>
                <option value="servico">Serviço / Mão de Obra</option>
                <option value="acabamento">Acabamento</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Preço de Venda (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
                Preço de Custo Interno (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={e => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Unidade de Medida
              </label>
              <select
                value={formData.unit_type}
                onChange={e => setFormData({ ...formData, unit_type: e.target.value as any })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              >
                <option value="metro">Metro Linear (m)</option>
                <option value="etiqueta">Etiqueta Adesiva</option>
                <option value="unit">Unidade (un)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Estoque Atual
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-primary-500/50"
              />
            </div>

            {(formData.unit_type === 'metro' || formData.unit_type === 'etiqueta') && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                  Largura do Rolo / Bobina (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.largura_rolo || ''}
                  onChange={e => setFormData({ ...formData, largura_rolo: Number(e.target.value) })}
                  placeholder="Ex: 1.52"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-primary-500/50"
                />
              </div>
            )}

            {/* Matérias-Primas & Insumos Utilizados (Composição) */}
            <div className="sm:col-span-2 p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Matérias-Primas & Insumos do Produto
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/70">
                    {formData.materias_primas?.length || 0} vinculada{formData.materias_primas?.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-white/70 hover:text-white">
                    <input
                      type="checkbox"
                      checked={autoSyncCost}
                      onChange={e => setAutoSyncCost(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-primary-500 cursor-pointer"
                    />
                    <span>Calcular Custo Auto</span>
                  </label>

                  {formData.materias_primas && formData.materias_primas.length > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyMateriasPrimasCost}
                      className="text-[11px] font-bold text-primary-400 hover:text-primary-300 underline flex items-center gap-1"
                    >
                      <Calculator size={12} />
                      Fixar Custo (R$ {calculateTotalMateriasPrimasCost().toFixed(2)})
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-white/50">
                Selecione as matérias-primas cadastradas por bobina, metro ou unidade para calcular automaticamente o custo do produto.
              </p>

              {/* Selector to add or edit materia prima */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={selectedMateriaPrimaId}
                      onChange={e => setSelectedMateriaPrimaId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500/50"
                    >
                      <option value="">-- Selecione a Matéria-Prima --</option>
                      {materiasPrimasList.map(mp => {
                        const custoM2 = mp.custoPorM2 || (mp.larguraMaterial && mp.larguraMaterial > 0 ? mp.costPrice / mp.larguraMaterial : mp.costPrice);
                        return (
                          <option key={mp.id} value={mp.id}>
                            {mp.name} — R$ {mp.costPrice.toFixed(2)}/{mp.unit} {mp.larguraMaterial ? `(R$ ${custoM2.toFixed(2)}/m²)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.001"
                      placeholder="Qtd consumida"
                      value={rawMaterialConsumedQty}
                      onChange={e => setRawMaterialConsumedQty(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-primary-500/50"
                    />
                    <span className="text-[11px] text-white/50 whitespace-nowrap">
                      {materiasPrimasList.find(m => m.id === selectedMateriaPrimaId)?.unit || 'un'}
                    </span>
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddMateriaPrimaToProduct}
                      className="flex-1 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 hover:text-primary-200 border border-primary-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> Vincular
                    </button>

                    {selectedMateriaPrimaId ? (
                      <button
                        type="button"
                        onClick={handleOpenEditMp}
                        title="Editar matéria-prima selecionada (bobina/metro/custo)"
                        className="px-2.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Edit2 size={13} className="text-primary-400" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenCreateMp}
                        title="Cadastrar nova matéria-prima por bobina ou metro"
                        className="px-2.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Plus size={13} />
                        <span className="hidden sm:inline">Nova</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Calculador de consumo para itens com dimensões (Ex: 50cm x 40cm) */}
              {(() => {
                const selectedMp = materiasPrimasList.find(m => m.id === selectedMateriaPrimaId);
                if (selectedMp && selectedMp.unit === 'm') {
                  const largBobina = selectedMp.larguraMaterial || 1.06;
                  const altM = (calcAlturaCm || 0) / 100;
                  const largM = (calcLarguraCm || 0) / 100;
                  const pecasNaLargura = Math.max(1, Math.floor(largBobina / (largM || 1)));
                  const consumoAvulso = altM; // puxa a altura toda da bobina
                  const consumoLote = pecasNaLargura > 0 && altM > 0 ? Number((altM / pecasNaLargura).toFixed(2)) : altM;

                  return (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary-400">
                          Calculadora de Peça (cm ➔ Metros Lineares)
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          Bobina: {largBobina}m
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="Largura"
                            value={calcLarguraCm || ''}
                            onChange={e => setCalcLarguraCm(parseFloat(e.target.value) || 0)}
                            className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-white font-mono text-xs"
                          />
                          <span className="text-white/50 text-[10px]">cm ×</span>
                          <input
                            type="number"
                            placeholder="Altura"
                            value={calcAlturaCm || ''}
                            onChange={e => setCalcAlturaCm(parseFloat(e.target.value) || 0)}
                            className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-white font-mono text-xs"
                          />
                          <span className="text-white/50 text-[10px]">cm</span>
                        </div>

                        {calcLarguraCm > 0 && calcAlturaCm > 0 && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setCalcModoAvulso(true);
                                setRawMaterialConsumedQty(consumoAvulso);
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                                calcModoAvulso 
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                              }`}
                              title="Puxa os 40cm da bobina para produzir 1 peça avulsa (com retalho)"
                            >
                              Avulsa: {consumoAvulso.toFixed(2)}m
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCalcModoAvulso(false);
                                setRawMaterialConsumedQty(consumoLote);
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                                !calcModoAvulso 
                                  ? 'bg-primary-500/20 border-primary-500/40 text-primary-300' 
                                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                              }`}
                              title={`Cabem ${pecasNaLargura} peças na largura da bobina. Consumo rateado.`}
                            >
                              Em Lote / Par: {consumoLote.toFixed(2)}m
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* List of configured raw materials */}
              {formData.materias_primas && formData.materias_primas.length > 0 ? (
                <div className="space-y-1.5 pt-2">
                  {formData.materias_primas.map((item, idx) => {
                    const lineCost = (item.costPrice || 0) * (item.quantity || 0);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs text-white"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.name}</span>
                          <span className="text-white/40">
                            → {item.quantity} {item.unit} (R$ {(item.costPrice || 0).toFixed(2)}/{item.unit})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-emerald-400 font-bold">
                            R$ {lineCost.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMateriaPrima(idx)}
                            className="text-white/30 hover:text-rose-400 transition-colors p-1"
                            title="Remover matéria-prima"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Resumo do Custo e Margem */}
                  {(() => {
                    const custoTotal = calculateTotalMateriasPrimasCost();
                    const precoVenda = Number(formData.price) || 0;
                    const lucroBruto = precoVenda - custoTotal;
                    const margemPercentual = precoVenda > 0 ? (lucroBruto / precoVenda) * 100 : 0;
                    const markupPercentual = custoTotal > 0 ? (lucroBruto / custoTotal) * 100 : 0;

                    return (
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white/90">Custo Total de Matérias-Primas:</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            R$ {custoTotal.toFixed(2)}
                          </span>
                        </div>

                        {precoVenda > 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                            <div>
                              <span className="text-white/50 block">Lucro Bruto Estimado:</span>
                              <span className={`font-mono font-bold ${lucroBruto >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                                R$ {lucroBruto.toFixed(2)} ({margemPercentual.toFixed(1)}% margem)
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-white/50 block">Markup sobre Insumos:</span>
                              <span className="font-mono font-bold text-sky-300">
                                {markupPercentual.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-3 text-xs text-white/30 border border-dashed border-white/10 rounded-lg">
                  Nenhuma matéria-prima vinculada a este produto/serviço ainda.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary-500 text-slate-900 font-black hover:bg-primary-400 shadow-lg shadow-primary-500/20"
            >
              {saving ? 'Salvando...' : editingProduct ? 'Atualizar Item' : 'Cadastrar Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Raw Material Modal (Add/Edit on the fly) */}
      <MateriaPrimaFormModal
        isOpen={isMpModalOpen}
        onClose={() => setIsMpModalOpen(false)}
        editingItem={editingMpItem}
        onSaved={handleSavedMp}
        companyId={currentCompany?.id}
      />
    </div>
  );
};
