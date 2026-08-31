import React, { useState, useEffect } from 'react';
import { 
  Box, Plus, Search, Filter, AlertTriangle, Edit2, Trash2, 
  Layers, Calculator, Download, Upload, RefreshCw, Check, X,
  DollarSign, PackageCheck, Wrench, Sparkles, Sliders
} from 'lucide-react';
import { Company, AppUser, Product } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { Badge, Button, Modal } from './SharedUI';
import * as XLSX from 'xlsx';

interface InventoryModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ currentCompany, user }) => {
  const [products, setProducts] = useState<any[]>([]);
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
    provider: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [currentCompany]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase.from('produtos').select('*').order('nome', { ascending: true });
      if (currentCompany?.id) {
        query = query.or(`company_id.eq.${currentCompany.id},company_id.is.null`);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('Fallback produtos query:', error.message);
        setProducts([]);
      } else {
        const mapped = (data || []).map((p: any) => ({
          id: p.id,
          name: p.nome || p.name || 'Produto',
          code: p.codigo || p.code || '',
          price: Number(p.preco || p.price || 0),
          costPrice: Number(p.preco_custo || p.cost_price || 0),
          stock: Number(p.estoque ?? p.stock ?? 0),
          minStock: Number(p.estoque_minimo || p.min_stock || 0),
          unitType: p.unidade || p.unit_type || 'unit',
          tipoItem: p.tipo_item || 'produto',
          larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
          comprimentoRolo: p.comprimento_rolo ? Number(p.comprimento_rolo) : undefined,
          valorMinimo: p.valor_minimo ? Number(p.valor_minimo) : undefined,
          controlaEstoque: p.controla_estoque ?? true,
          category: p.categoria || p.category || 'Geral',
          provider: p.fornecedor || p.provider || ''
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (prod?: any) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        name: prod.name || '',
        code: prod.code || '',
        price: prod.price || 0,
        cost_price: prod.costPrice || 0,
        stock: prod.stock || 0,
        min_stock: prod.minStock || 5,
        unit_type: prod.unitType || 'unit',
        tipo_item: prod.tipoItem || 'produto',
        largura_rolo: prod.larguraRolo || 0,
        comprimento_rolo: prod.comprimentoRolo || 0,
        valor_minimo: prod.valorMinimo || 0,
        controla_estoque: prod.controlaEstoque ?? true,
        category: prod.category || 'Geral',
        provider: prod.provider || ''
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
        provider: ''
      });
    }
    setIsModalOpen(true);
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
        updated_at: new Date().toISOString()
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('produtos')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
        showAlert('Item atualizado com sucesso!');
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('produtos')
          .insert([payload]);
        if (error) throw error;
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
                <option value="unit">Unidade (un)</option>
                <option value="m2">Metro Quadrado (m²)</option>
                <option value="metro">Metro Linear (m)</option>
                <option value="etiqueta">Etiqueta Adesiva</option>
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

            {formData.unit_type === 'm2' && (
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Largura Rolo (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.largura_rolo}
                    onChange={e => setFormData({ ...formData, largura_rolo: Number(e.target.value) })}
                    placeholder="Ex: 1.52"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Comprimento Rolo (m)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.comprimento_rolo}
                    onChange={e => setFormData({ ...formData, comprimento_rolo: Number(e.target.value) })}
                    placeholder="Ex: 50.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none"
                  />
                </div>
              </div>
            )}
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
    </div>
  );
};
