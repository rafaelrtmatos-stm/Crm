import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Phone, Mail, MapPin, CreditCard, 
  ShoppingBag, History, Edit2, Trash2, MessageSquare, Download,
  Upload, Filter, Check, X, Building2, AlertCircle, FileText
} from 'lucide-react';
import { Company } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { formatPhoneBR, formatCpfCnpj } from '../lib/validators';
import { searchAddressByCep } from '../lib/cepUtils';
import { Badge, Button, GlassCard, Modal, PhoneInputBR, CpfCnpjInput, RgInput } from './SharedUI';
import * as XLSX from 'xlsx';

interface ContactsModuleProps {
  currentCompany?: Company | null;
  onViewHistoryForClient?: (clienteId: string, clienteName: string) => void;
  onStartSaleForClient?: (cliente: any) => void;
  onOpenReceiptById?: (saleId: string) => void;
}

export const ContactsModule: React.FC<ContactsModuleProps> = ({
  currentCompany,
  onViewHistoryForClient,
  onStartSaleForClient,
  onOpenReceiptById
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(currentCompany?.id || 'all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    telefone_alternativo: '',
    cpf_cnpj: '',
    rg: '',
    email: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: 'PA',
    saldo_credito: 0,
    observacoes: '',
    tipo: 'cliente' as 'cliente' | 'fornecedor' | 'parceiro'
  });

  useEffect(() => {
    fetchClients();
  }, [currentCompany]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      let query = supabase.from('clientes').select('*').is('deleted_at', null).order('nome', { ascending: true });
      if (currentCompany?.id) {
        query = query.or(`company_id.eq.${currentCompany.id},company_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
      // Fallback local mock if offline
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (client?: any) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        nome: client.nome || '',
        telefone: client.telefone || '',
        telefone_alternativo: client.telefone_alternativo || '',
        cpf_cnpj: client.cpf_cnpj || '',
        rg: client.rg || '',
        email: client.email || '',
        cep: client.cep || '',
        logradouro: client.logradouro || client.endereco || '',
        numero: client.numero || '',
        bairro: client.bairro || '',
        cidade: client.cidade || '',
        estado: client.estado || 'PA',
        saldo_credito: client.saldo_credito || 0,
        observacoes: client.observacoes || '',
        tipo: client.tipo || 'cliente'
      });
    } else {
      setEditingClient(null);
      setFormData({
        nome: '',
        telefone: '',
        telefone_alternativo: '',
        cpf_cnpj: '',
        rg: '',
        email: '',
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: 'PA',
        saldo_credito: 0,
        observacoes: '',
        tipo: 'cliente'
      });
    }
    setIsModalOpen(true);
  };

  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await searchAddressByCep(cleanCep);
        if (res) {
          setFormData(prev => ({
            ...prev,
            logradouro: res.logradouro || prev.logradouro,
            bairro: res.bairro || prev.bairro,
            cidade: res.localidade || prev.cidade,
            estado: res.uf || prev.estado
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      showAlert('Informe o nome do cliente.');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        telefone_alternativo: formData.telefone_alternativo.trim() || null,
        cpf_cnpj: formData.cpf_cnpj.trim() || null,
        rg: formData.rg.trim() || null,
        email: formData.email.trim() || null,
        cep: formData.cep.trim() || null,
        logradouro: formData.logradouro.trim() || null,
        endereco: formData.logradouro.trim() || null,
        numero: formData.numero.trim() || null,
        bairro: formData.bairro.trim() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim() || 'PA',
        saldo_credito: Number(formData.saldo_credito) || 0,
        observacoes: formData.observacoes.trim() || null,
        company_id: currentCompany?.id || null,
        updated_at: new Date().toISOString()
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', editingClient.id);
        if (error) throw error;
        setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...payload } : c));
        showAlert('Cliente atualizado com sucesso!');
      } else {
        payload.created_at = new Date().toISOString();
        const { data, error } = await supabase
          .from('clientes')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setClients(prev => [data, ...prev]);
        showAlert('Cliente cadastrado com sucesso!');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      showAlert(`Erro ao salvar: ${err.message || 'Falha na gravação'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (client: any) => {
    if (!window.confirm(`Tem certeza que deseja remover o cliente "${client.nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', client.id);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== client.id));
      showAlert('Cliente removido com sucesso.');
    } catch (err: any) {
      console.error('Erro ao remover cliente:', err);
      showAlert('Erro ao remover cliente.');
    }
  };

  const handleExportExcel = () => {
    if (clients.length === 0) {
      showAlert('Nenhum cliente para exportar.');
      return;
    }
    const dataToExport = clients.map(c => ({
      'ID': c.id,
      'Nome': c.nome,
      'Telefone': c.telefone,
      'Telefone Alternativo': c.telefone_alternativo || '',
      'CPF/CNPJ': c.cpf_cnpj || '',
      'RG': c.rg || '',
      'E-mail': c.email || '',
      'Cidade': c.cidade || '',
      'Bairro': c.bairro || '',
      'Endereço': `${c.logradouro || ''} ${c.numero || ''}`.trim(),
      'Saldo Crédito (R$)': (c.saldo_credito || 0).toFixed(2),
      'Observações': c.observacoes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `Clientes_${currentCompany?.shortName || 'RafaArts'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenWhatsApp = (phone: string, name: string) => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) {
      showAlert('Cliente não possui telefone cadastrado.');
      return;
    }
    const fullPhone = clean.length <= 11 ? `55${clean}` : clean;
    const text = encodeURIComponent(`Olá ${name}, tudo bem? Aqui é da ${currentCompany?.name || 'Rafa Arts Graphics'}.`);
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const filteredClients = clients.filter(c => {
    const matchSearch = 
      (c.nome && c.nome.toLowerCase().includes(search.toLowerCase())) ||
      (c.telefone && c.telefone.includes(search)) ||
      (c.cpf_cnpj && c.cpf_cnpj.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.cidade && c.cidade.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="text-primary-400" size={24} />
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
              Cadastro de Clientes & Contatos
            </h2>
          </div>
          <p className="text-xs text-white/50">
            Gerencie contatos, telefones, histórico de compras, crédito em conta e endereços.
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
            <span>Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Search & Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone, CPF/CNPJ, e-mail ou cidade..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/10 focus:border-primary-500/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Total Cadastrado</span>
          <span className="text-lg font-black text-primary-400 font-mono">{clients.length}</span>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="p-12 text-center text-white/40">Carregando contatos...</div>
      ) : filteredClients.length === 0 ? (
        <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center space-y-3">
          <Users className="mx-auto text-white/20" size={40} />
          <p className="text-sm font-bold text-white/60">Nenhum cliente encontrado.</p>
          <Button onClick={() => handleOpenAddModal()} variant="secondary" className="mx-auto text-xs">
            <Plus size={14} /> Cadastrar Primeiro Cliente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <div
              key={client.id}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                      {client.nome}
                    </h3>
                    {client.cpf_cnpj && (
                      <p className="text-[10px] text-white/40 font-mono">{formatCpfCnpj(client.cpf_cnpj)}</p>
                    )}
                  </div>
                  {client.saldo_credito > 0 && (
                    <Badge variant="success" className="text-[8px] shrink-0">
                      Crédito R$ {Number(client.saldo_credito).toFixed(2)}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 text-xs text-white/70">
                  {client.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-primary-400 shrink-0" />
                      <span className="font-mono">{formatPhoneBR(client.telefone)}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-white/40 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {(client.cidade || client.logradouro) && (
                    <div className="flex items-center gap-2 text-[11px] text-white/50 truncate">
                      <MapPin size={13} className="text-white/40 shrink-0" />
                      <span className="truncate">{client.cidade ? `${client.cidade} - ${client.estado || 'PA'}` : client.logradouro}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1">
                  {onStartSaleForClient && (
                    <button
                      onClick={() => onStartSaleForClient(client)}
                      className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                      title="Abrir venda direta no PDV para este cliente"
                    >
                      <ShoppingBag size={12} />
                      <span>Venda</span>
                    </button>
                  )}

                  {onViewHistoryForClient && (
                    <button
                      onClick={() => onViewHistoryForClient(client.id, client.nome)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                      title="Ver compras anteriores deste cliente"
                    >
                      <History size={12} />
                      <span className="hidden sm:inline">Histórico</span>
                    </button>
                  )}

                  {client.telefone && (
                    <button
                      onClick={() => handleOpenWhatsApp(client.telefone, client.nome)}
                      className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
                      title="Conversar via WhatsApp"
                    >
                      <MessageSquare size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenAddModal(client)}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    title="Editar dados do cliente"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client)}
                    className="p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Excluir cliente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Nome Completo / Razão Social *
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: João da Silva / Rafa Arts Comunicação"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <PhoneInputBR
              label="Telefone WhatsApp (Principal)"
              value={formData.telefone}
              onChange={v => setFormData({ ...formData, telefone: v })}
            />

            <PhoneInputBR
              label="Telefone Alternativo / Fixo"
              value={formData.telefone_alternativo}
              onChange={v => setFormData({ ...formData, telefone_alternativo: v })}
            />

            <CpfCnpjInput
              label="CPF ou CNPJ"
              value={formData.cpf_cnpj}
              onChange={v => setFormData({ ...formData, cpf_cnpj: v })}
            />

            <RgInput
              label="RG / Inscrição Estadual"
              value={formData.rg}
              onChange={v => setFormData({ ...formData, rg: v })}
            />

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                CEP {isSearchingCep && <span className="text-primary-400 font-normal">(Buscando...)</span>}
              </label>
              <input
                type="text"
                value={formData.cep}
                onChange={e => {
                  setFormData({ ...formData, cep: e.target.value });
                  handleCepLookup(e.target.value);
                }}
                placeholder="68000-000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Logradouro / Rua
              </label>
              <input
                type="text"
                value={formData.logradouro}
                onChange={e => setFormData({ ...formData, logradouro: e.target.value })}
                placeholder="Av. Principal"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Número</label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={e => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="123"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Bairro</label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Centro"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Santarém"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Estado</label>
                <input
                  type="text"
                  value={formData.estado}
                  onChange={e => setFormData({ ...formData, estado: e.target.value })}
                  placeholder="PA"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Saldo de Crédito em Conta (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.saldo_credito}
                onChange={e => setFormData({ ...formData, saldo_credito: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Observações</label>
              <input
                type="text"
                value={formData.observacoes}
                onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações internas sobre o cliente"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
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
              {saving ? 'Salvando...' : editingClient ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
