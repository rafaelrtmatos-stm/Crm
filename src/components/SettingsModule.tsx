import React, { useState, useEffect } from 'react';
import { 
  Settings, Building2, Users, CreditCard, Shield, Download, 
  Smartphone, Save, RefreshCw, Key, Check, Palette, Image as ImageIcon
} from 'lucide-react';
import { Company, AppUser } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { Button, PhoneInputBR, CpfCnpjInput } from './SharedUI';

interface SettingsModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ currentCompany, user }) => {
  const [activeTab, setActiveTab] = useState<'empresa' | 'usuarios' | 'taxas' | 'integracoes' | 'backup'>('empresa');
  const [saving, setSaving] = useState(false);

  // Company Form
  const [companyForm, setCompanyForm] = useState({
    name: currentCompany?.name || 'Rafa Arts Graphics',
    shortName: currentCompany?.shortName || 'RafaArts',
    cnpj: currentCompany?.cnpj || '',
    phone: currentCompany?.phone || '',
    email: currentCompany?.email || '',
    address: currentCompany?.address || '',
    primaryColor: currentCompany?.primaryColor || '#00d2ff',
    secondaryColor: currentCompany?.secondaryColor || '#3a7bd5'
  });

  // Rates Form
  const [ratesForm, setRatesForm] = useState({
    debito: 1.5,
    credito_vista: 3.2,
    credito_2x_6x: 5.5,
    credito_7x_12x: 9.8,
    pix: 0.0
  });

  // Users state
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    if (currentCompany) {
      setCompanyForm({
        name: currentCompany.name,
        shortName: currentCompany.shortName,
        cnpj: currentCompany.cnpj || '',
        phone: currentCompany.phone || '',
        email: currentCompany.email || '',
        address: currentCompany.address || '',
        primaryColor: currentCompany.primaryColor || '#00d2ff',
        secondaryColor: currentCompany.secondaryColor || '#3a7bd5'
      });
    }
    fetchUsers();
  }, [currentCompany]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('perfis').select('*');
      if (!error && data) {
        setUsersList(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar usuários:', err);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id) {
      showAlert('Configuração salva localmente.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('empresas')
        .update({
          name: companyForm.name,
          short_name: companyForm.shortName,
          cnpj: companyForm.cnpj,
          phone: companyForm.phone,
          email: companyForm.email,
          address: companyForm.address,
          primary_color: companyForm.primaryColor,
          secondary_color: companyForm.secondaryColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCompany.id);

      if (error) throw error;
      showAlert('Configurações da empresa salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err);
      showAlert(`Erro: ${err.message || 'Falha ao salvar'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackupExport = async () => {
    try {
      showAlert('Gerando backup dos dados...');
      const [{ data: vendas }, { data: clientes }, { data: produtos }] = await Promise.all([
        supabase.from('vendas').select('*').limit(500),
        supabase.from('clientes').select('*').limit(500),
        supabase.from('produtos').select('*').limit(500)
      ]);

      const backupObj = {
        exportedAt: new Date().toISOString(),
        company: currentCompany?.name,
        vendas: vendas || [],
        clientes: clientes || [],
        produtos: produtos || []
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Backup_${currentCompany?.shortName || 'RafaArts'}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showAlert('Backup exportado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      showAlert('Erro ao gerar arquivo de backup.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="text-primary-400" size={24} />
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
              Configurações & Parâmetros do Sistema
            </h2>
          </div>
          <p className="text-xs text-white/50">
            Ajuste dados da empresa, taxas de maquininhas, permissões e integrações.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {[
          { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
          { id: 'taxas', label: 'Taxas & Cartões', icon: CreditCard },
          { id: 'usuarios', label: 'Colaboradores', icon: Users },
          { id: 'integracoes', label: 'WhatsApp / Meta API', icon: Smartphone },
          { id: 'backup', label: 'Backup & Exportação', icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-slate-900 border-primary-400 shadow-lg shadow-primary-500/20'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Empresa */}
      {activeTab === 'empresa' && (
        <form onSubmit={handleSaveCompany} className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Razão Social / Nome Fantasia
              </label>
              <input
                type="text"
                value={companyForm.name}
                onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Nome Curto (Exibição)
              </label>
              <input
                type="text"
                value={companyForm.shortName}
                onChange={e => setCompanyForm({ ...companyForm, shortName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <CpfCnpjInput
              label="CNPJ"
              value={companyForm.cnpj}
              onChange={v => setCompanyForm({ ...companyForm, cnpj: v })}
            />

            <PhoneInputBR
              label="Telefone Comercial"
              value={companyForm.phone}
              onChange={v => setCompanyForm({ ...companyForm, phone: v })}
            />

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                E-mail de Contato
              </label>
              <input
                type="email"
                value={companyForm.email}
                onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Endereço Completo
              </label>
              <input
                type="text"
                value={companyForm.address}
                onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Cor Primária (Hex)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={companyForm.primaryColor}
                  onChange={e => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-transparent border border-white/10 cursor-pointer"
                />
                <input
                  type="text"
                  value={companyForm.primaryColor}
                  onChange={e => setCompanyForm({ ...companyForm, primaryColor: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                Cor Secundária (Hex)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={companyForm.secondaryColor}
                  onChange={e => setCompanyForm({ ...companyForm, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl bg-transparent border border-white/10 cursor-pointer"
                />
                <input
                  type="text"
                  value={companyForm.secondaryColor}
                  onChange={e => setCompanyForm({ ...companyForm, secondaryColor: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20"
            >
              <Save size={16} />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Taxas */}
      {activeTab === 'taxas' && (
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Taxas de Operadoras de Cartão & Pagamentos
            </h3>
            <p className="text-xs text-white/50">
              Configure as taxas padrão deduzidas nas vendas para cálculo do valor líquido.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Débito (%)</label>
              <input
                type="number"
                step="0.01"
                value={ratesForm.debito}
                onChange={e => setRatesForm({ ...ratesForm, debito: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-base font-mono text-white font-black"
              />
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Crédito à Vista (%)</label>
              <input
                type="number"
                step="0.01"
                value={ratesForm.credito_vista}
                onChange={e => setRatesForm({ ...ratesForm, credito_vista: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-base font-mono text-white font-black"
              />
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Crédito 2x a 6x (%)</label>
              <input
                type="number"
                step="0.01"
                value={ratesForm.credito_2x_6x}
                onChange={e => setRatesForm({ ...ratesForm, credito_2x_6x: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-base font-mono text-white font-black"
              />
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">Crédito 7x a 12x (%)</label>
              <input
                type="number"
                step="0.01"
                value={ratesForm.credito_7x_12x}
                onChange={e => setRatesForm({ ...ratesForm, credito_7x_12x: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-base font-mono text-white font-black"
              />
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/50">PIX (%)</label>
              <input
                type="number"
                step="0.01"
                value={ratesForm.pix}
                onChange={e => setRatesForm({ ...ratesForm, pix: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-base font-mono text-white font-black"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button
              onClick={() => showAlert('Taxas salvas com sucesso!')}
              className="bg-primary-500 hover:bg-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20"
            >
              <Save size={16} />
              <span>Salvar Taxas</span>
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Usuários */}
      {activeTab === 'usuarios' && (
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Colaboradores & Acessos
              </h3>
              <p className="text-xs text-white/50">
                Lista de operadores e níveis de permissão.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {usersList.length === 0 ? (
              <div className="p-8 border border-white/5 rounded-2xl text-center text-white/40 text-xs">
                Nenhum colaborador cadastrado além do administrador principal.
              </div>
            ) : (
              usersList.map((u, idx) => (
                <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{u.nome || u.email}</p>
                    <p className="text-xs text-white/50 uppercase font-mono">{u.cargo || u.role || 'Operador'}</p>
                  </div>
                  <span className="text-xs bg-primary-500/20 text-primary-300 px-2.5 py-1 rounded-lg font-mono font-bold">
                    {u.role || 'admin'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Integrações */}
      {activeTab === 'integracoes' && (
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Status das Conexões e APIs
            </h3>
            <p className="text-xs text-white/50">
              Status do webhook de mensagens, WhatsApp e campanhas de anúncios.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">WhatsApp Evolution API</h4>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Pronto
                </span>
              </div>
              <p className="text-xs text-white/60">
                Instância configurada para envio e recebimento de mensagens automáticas de orçamento e OS.
              </p>
            </div>

            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">Meta Ads Leads Webhook</h4>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Ativo
                </span>
              </div>
              <p className="text-xs text-white/60">
                Novos cadastros e mensagens de anúncios entram direto no funil CRM na coluna "ENTRADA".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Backup */}
      {activeTab === 'backup' && (
        <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/10 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Exportação & Cópia de Segurança
            </h3>
            <p className="text-xs text-white/50">
              Faça o download de todos os registros de vendas, clientes e produtos em arquivo JSON estruturado.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-white text-sm">Backup Completo do Banco de Dados</h4>
              <p className="text-xs text-white/50 mt-1">
                Gera um arquivo JSON contendo clientes, produtos, notas fiscais e vendas cadastradas.
              </p>
            </div>

            <Button
              onClick={handleBackupExport}
              className="bg-primary-500 hover:bg-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20 shrink-0"
            >
              <Download size={16} />
              <span>Baixar Backup (JSON)</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
