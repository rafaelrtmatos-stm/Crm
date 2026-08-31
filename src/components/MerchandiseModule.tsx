import React, { useState } from 'react';
import { Box, Plus, AlertCircle, ShoppingBag, Trash2, Edit2, Check, ArrowRight, ShieldAlert, DollarSign, Calculator, Layers, FileText } from 'lucide-react';
import { MerchandiseItem } from '../types';
import { showAlert } from '../lib/notify';

interface MerchandiseModuleProps {
  onAttachItemsToContract?: (items: MerchandiseItem[], totalValue: number, description: string) => void;
}

export const INITIAL_MERCHANDISE: MerchandiseItem[] = [
  {
    id: 'merch-1',
    code: 'GRF-001',
    description: 'Painel Fachada ACM 3x1m Prata com Estrutura Galvanizada',
    costPrice: 1200.00, // Custo interno
    salePrice: 2800.00, // Valor de venda unitário
    stock: 5,
    unit: 'un',
    quantity: 1,
    totalPrice: 2800.00,
    category: 'Fachadas & Painéis'
  },
  {
    id: 'merch-2',
    code: 'GRF-002',
    description: 'Lona Frontlight 440g com Ilhós Reforçado',
    costPrice: 22.00, // Custo m² interno
    salePrice: 65.00, // Venda m²
    stock: 120,
    unit: 'm2',
    quantity: 10,
    totalPrice: 650.00,
    category: 'Lonas'
  },
  {
    id: 'merch-3',
    code: 'GRF-003',
    description: 'Adesivo Vinil Brilho com Impressão Digital Alta Resolução',
    costPrice: 18.00,
    salePrice: 55.00,
    stock: 0, // Estoque zerado para testar o alerta não-bloqueante
    unit: 'm2',
    quantity: 5,
    totalPrice: 275.00,
    category: 'Adesivos'
  },
  {
    id: 'merch-4',
    code: 'GRF-004',
    description: 'Cartão de Visita 300g Verniz Localizado 1000un',
    costPrice: 45.00,
    salePrice: 130.00,
    stock: 25,
    unit: 'un',
    quantity: 1,
    totalPrice: 130.00,
    category: 'Impressos Rápido'
  }
];

export const MerchandiseModule: React.FC<MerchandiseModuleProps> = ({ onAttachItemsToContract }) => {
  const [items, setItems] = useState<MerchandiseItem[]>(INITIAL_MERCHANDISE);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(['merch-1', 'merch-2']);
  
  // New item modal / inline form state
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formDescription, setFormDescription] = useState('');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(10);
  const [formUnit, setFormUnit] = useState<'un' | 'm' | 'm2'>('un');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formCategory, setFormCategory] = useState('Geral');

  const handleOpenAddModal = (itemToEdit?: MerchandiseItem) => {
    if (itemToEdit) {
      setEditingId(itemToEdit.id);
      setFormDescription(itemToEdit.description);
      setFormCostPrice(itemToEdit.costPrice);
      setFormSalePrice(itemToEdit.salePrice);
      setFormStock(itemToEdit.stock);
      setFormUnit(itemToEdit.unit);
      setFormQuantity(itemToEdit.quantity);
      setFormCategory(itemToEdit.category || 'Geral');
    } else {
      setEditingId(null);
      setFormDescription('');
      setFormCostPrice(0);
      setFormSalePrice(0);
      setFormStock(10);
      setFormUnit('un');
      setFormQuantity(1);
      setFormCategory('Geral');
    }
    setIsAddingModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription || formSalePrice <= 0) {
      showAlert('Preencha a descrição e o valor de venda.');
      return;
    }

    if (editingId) {
      setItems(prev => prev.map(item => {
        if (item.id === editingId) {
          const qty = formQuantity > 0 ? formQuantity : 1;
          return {
            ...item,
            description: formDescription,
            costPrice: formCostPrice,
            salePrice: formSalePrice,
            stock: formStock,
            unit: formUnit,
            quantity: qty,
            totalPrice: qty * formSalePrice,
            category: formCategory
          };
        }
        return item;
      }));
    } else {
      const newItem: MerchandiseItem = {
        id: `merch-${Date.now()}`,
        code: `GRF-${Math.floor(100 + Math.random() * 900)}`,
        description: formDescription,
        costPrice: formCostPrice,
        salePrice: formSalePrice,
        stock: formStock,
        unit: formUnit,
        quantity: formQuantity > 0 ? formQuantity : 1,
        totalPrice: (formQuantity > 0 ? formQuantity : 1) * formSalePrice,
        category: formCategory
      };
      setItems(prev => [newItem, ...prev]);
    }

    setIsAddingModalOpen(false);
  };

  const handleQuantityChange = (id: string, newQty: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const qty = newQty > 0 ? newQty : 0.1;
        return {
          ...item,
          quantity: qty,
          totalPrice: qty * item.salePrice
        };
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedItemIds(prev => prev.filter(i => i !== id));
  };

  const toggleSelect = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Calculations for selected items
  const selectedItemsList = items.filter(i => selectedItemIds.includes(i.id));
  const totalCartValue = selectedItemsList.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalCostValue = selectedItemsList.reduce((acc, curr) => acc + (curr.costPrice * curr.quantity), 0);
  const totalProfitMargin = totalCartValue - totalCostValue;

  // Warning stock items (stock <= 0)
  const lowStockItems = items.filter(i => i.stock <= 0);

  const handleSendToContract = () => {
    if (selectedItemsList.length === 0) {
      showAlert('Selecione ao menos um item de mercadoria.');
      return;
    }

    const descriptionString = selectedItemsList
      .map(i => `• ${i.description} (${i.quantity} ${i.unit === 'm2' ? 'm²' : i.unit === 'm' ? 'm' : 'un'} x R$ ${i.salePrice.toFixed(2)}) = R$ ${i.totalPrice.toFixed(2)}`)
      .join('\n');

    if (onAttachItemsToContract) {
      onAttachItemsToContract(selectedItemsList, totalCartValue, descriptionString);
    } else {
      showAlert(`Itens selecionados adicionados ao contrato!\nTotal: R$ ${totalCartValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stock Alert Banner (Non-blocking warning) */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Alerta de Estoque Crítico ({lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'itens'})
              </p>
              <p className="text-[10px] text-zinc-300">
                Itens com estoque zerado/negativo podem continuar sendo orçados e vendidos (alerta informativo sem bloqueio):{' '}
                <span className="font-bold text-amber-300">{lowStockItems.map(i => i.description).join(', ')}</span>
              </p>
            </div>
          </div>
          <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-2.5 py-1 rounded-full uppercase border border-amber-500/30">
            Venda Não-Bloqueada
          </span>
        </div>
      )}

      {/* Top Controls */}
      <div className="p-6 bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950 border border-red-500/30 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Box className="text-red-500" size={22} />
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
              Cadastro de Mercadorias & Produtos Gráficos
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Gerencie itens com custo interno sigiloso, preços de venda, baixa no estoque e unidades (Un, m, m²)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950 transition-all"
          >
            <Plus size={16} />
            <span>Novo Item de Mercadoria</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Merchandise List + Selected Cart Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table of Items */}
        <div className="lg:col-span-8 bg-zinc-950 border border-red-500/20 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-red-500" />
              Catálogo de Mercadorias Disponíveis ({items.length})
            </h3>
            <span className="text-[10px] text-zinc-400">Marque as caixas para somar ao Contrato</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {items.map(item => {
              const isSelected = selectedItemIds.includes(item.id);
              const isStockOut = item.stock <= 0;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected 
                      ? 'bg-red-950/20 border-red-500/40' 
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 w-4 h-4 accent-red-600 rounded cursor-pointer"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">{item.description}</span>
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 font-mono px-2 py-0.5 rounded border border-zinc-700">
                          {item.code}
                        </span>
                        <span className="text-[9px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold uppercase">
                          Unidade: {item.unit === 'm2' ? 'm²' : item.unit === 'm' ? 'Metro' : 'Unid'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-zinc-400 pt-0.5">
                        <span className="text-emerald-400 font-bold">
                          Venda: R$ {item.salePrice.toFixed(2)} / {item.unit}
                        </span>
                        <span className="text-zinc-500 italic bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          🔒 Custo Interno: R$ {item.costPrice.toFixed(2)} (Oculto do Cliente)
                        </span>
                        <span className={`font-bold ${isStockOut ? 'text-amber-400' : 'text-zinc-400'}`}>
                          Estoque: {item.stock} {item.unit} {isStockOut && '(ALERTA)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Input & Subtotal */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="space-y-1 text-right">
                      <label className="text-[9px] text-zinc-400 uppercase font-bold">Qtd ({item.unit})</label>
                      <input
                        type="number"
                        step={item.unit === 'un' ? '1' : '0.1'}
                        min="0.1"
                        value={item.quantity}
                        onChange={e => handleQuantityChange(item.id, Number(e.target.value))}
                        className="w-20 h-9 bg-zinc-950 border border-zinc-800 focus:border-red-500 rounded-xl text-center text-xs font-mono font-bold text-white outline-none"
                      />
                    </div>

                    <div className="text-right min-w-[90px]">
                      <p className="text-[9px] text-zinc-400 uppercase font-bold">Subtotal</p>
                      <p className="text-xs font-black text-red-400 font-mono">
                        R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenAddModal(item)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                        title="Editar item"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all"
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
        </div>

        {/* Right Panel - Totalizer & Integration with Contract */}
        <div className="lg:col-span-4 bg-zinc-950 border border-red-500/20 rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
              <Calculator size={16} />
              Resumo do Orçamento Selecionado
            </h3>

            <div className="space-y-3">
              <p className="text-[10px] text-zinc-400 font-bold uppercase">
                Itens Incorportados ao Pedido ({selectedItemsList.length})
              </p>

              {selectedItemsList.length === 0 ? (
                <div className="p-6 border border-dashed border-zinc-800 rounded-2xl text-center text-zinc-500 text-xs">
                  Nenhum item selecionado.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {selectedItemsList.map(i => (
                    <div key={i.id} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white text-[11px] truncate max-w-[180px]">{i.description}</p>
                        <p className="text-[9px] text-zinc-400">
                          {i.quantity} {i.unit} x R$ {i.salePrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-black font-mono text-red-400">
                        R$ {i.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Calculation Card */}
              <div className="p-4 bg-gradient-to-br from-red-950/40 to-zinc-900 border border-red-500/30 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs text-zinc-300">
                  <span>Total do Cliente (bruto):</span>
                  <span className="font-bold text-white font-mono">
                    R$ {totalCartValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-zinc-400 border-t border-zinc-800 pt-2">
                  <span>🔒 Custo Interno Total:</span>
                  <span className="font-mono text-zinc-300">
                    R$ {totalCostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                  <span>Margem de Lucro Bruta:</span>
                  <span className="font-mono">
                    +R$ {totalProfitMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border-t border-red-500/20 pt-2 flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase">Entrada 50%:</span>
                  <span className="text-sm font-black text-red-400 font-mono">
                    R$ {(totalCartValue / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSendToContract}
            disabled={selectedItemsList.length === 0}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition-all"
          >
            <FileText size={16} />
            <span>Incorporate ao Contrato (R$ {totalCartValue.toFixed(2)})</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Add / Edit Merchandise Modal */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-950 border border-red-500/30 rounded-3xl p-6 w-full max-w-lg space-y-4 text-white shadow-2xl">
            <h3 className="text-base font-black uppercase italic tracking-tight text-white flex items-center gap-2">
              <Box size={18} className="text-red-500" />
              {editingId ? 'Editar Mercadoria' : 'Cadastrar Nova Mercadoria'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Descrição do Item *</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white outline-none"
                  placeholder="Ex: Lona Frontlight 440g com Ilhós"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Valor de Custo Interno (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCostPrice}
                    onChange={e => setFormCostPrice(Number(e.target.value))}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white font-mono outline-none"
                    placeholder="0.00"
                  />
                  <p className="text-[8px] text-zinc-500 italic">Nunca exibido ao cliente</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-red-400 uppercase">
                    Valor de Venda Unitário (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSalePrice}
                    onChange={e => setFormSalePrice(Number(e.target.value))}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white font-mono outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Unidade</label>
                  <select
                    value={formUnit || 'un'}
                    onChange={e => setFormUnit(e.target.value as any)}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white outline-none"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="m">Metro (m)</option>
                    <option value="m2">Metro ² (m²)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Qtd Padrão</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formQuantity}
                    onChange={e => setFormQuantity(Number(e.target.value))}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Estoque Disp.</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={e => setFormStock(Number(e.target.value))}
                    className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-red-950"
                >
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
