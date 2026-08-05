import React, { useState } from 'react';
import { Building2, Upload, Save, X, Check, Image as ImageIcon, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { CompanyConfig } from '../types';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyConfig: CompanyConfig;
  onSave: (config: CompanyConfig) => void;
}

export const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  razaoSocial: 'RAFA ARTS GRAPHICS',
  cnpj: '28.884.125/0001-40',
  endereco: 'Av. T-63, nº 1200 - Setor Bueno, Goiânia - GO',
  logoUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=300&auto=format&fit=crop&q=80',
  phone: '(62) 99876-5432',
  email: 'contato@rafaartsgraphics.com.br',
  cidadeForo: 'Goiânia - GO'
};

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  companyConfig,
  onSave
}) => {
  const [form, setForm] = useState<CompanyConfig>({
    ...DEFAULT_COMPANY_CONFIG,
    ...companyConfig
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-950 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 border border-red-500/30 rounded-2xl text-red-500">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white uppercase italic">
                Cadastro de Empresa Configurável
              </h2>
              <p className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
                Dados oficiais para Contratos, Orçamentos e Documentos
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Logo Upload Section */}
          <div className="p-4 bg-zinc-900/80 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center relative group">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo Empresa" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon size={32} className="text-zinc-600" />
              )}
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <p className="text-xs font-black text-white uppercase tracking-wider">Logo da Gráfica / Empresa</p>
              <p className="text-[10px] text-zinc-400">Insira a imagem oficial para aparecer no cabeçalho do PDF dos contratos</p>
              <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                <label className="cursor-pointer px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-950">
                  <Upload size={14} />
                  <span>Fazer Upload de Imagem</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Razão Social */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Building2 size={12} className="text-red-500" />
                Razão Social / Nome Fantasia *
              </label>
              <input
                type="text"
                required
                value={form.razaoSocial}
                onChange={e => setForm({ ...form, razaoSocial: e.target.value })}
                className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3.5 text-xs font-semibold text-white outline-none"
                placeholder="Ex: RAFA ARTS GRAPHICS"
              />
            </div>

            {/* CNPJ */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <FileText size={12} className="text-red-500" />
                CNPJ *
              </label>
              <input
                type="text"
                required
                value={form.cnpj}
                onChange={e => setForm({ ...form, cnpj: e.target.value })}
                className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3.5 text-xs font-mono font-semibold text-white outline-none"
                placeholder="00.000.000/0001-00"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Phone size={12} className="text-red-500" />
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={form.phone || ''}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3.5 text-xs font-semibold text-white outline-none"
                placeholder="(62) 99876-5432"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Mail size={12} className="text-red-500" />
                E-mail Comercial
              </label>
              <input
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3.5 text-xs font-semibold text-white outline-none"
                placeholder="contato@empresa.com.br"
              />
            </div>
          </div>

          {/* Endereço Completo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <MapPin size={12} className="text-red-500" />
              Endereço Completo da Sede *
            </label>
            <input
              type="text"
              required
              value={form.endereco}
              onChange={e => setForm({ ...form, endereco: e.target.value })}
              className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3.5 text-xs font-semibold text-white outline-none"
              placeholder="Av. T-63, nº 1200 - Setor Bueno, Goiânia - GO"
            />
          </div>

          {/* Cidade do Foro */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <MapPin size={12} className="text-red-500" />
              Cidade da Comarca do Foro (Cláusula 9)
            </label>
            <input
              type="text"
              value={form.cidadeForo || ''}
              onChange={e => setForm({ ...form, cidadeForo: e.target.value })}
              className="w-full h-11 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3.5 text-xs font-semibold text-white outline-none"
              placeholder="Goiânia - GO"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check size={16} className="text-white" />
                  <span>Salvo com Sucesso!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salvar Dados da Empresa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
