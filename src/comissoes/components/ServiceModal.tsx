import React, { useState, useEffect } from 'react';
import { X, Check, Calculator, AlertCircle, Layers, Tag } from 'lucide-react';
import { ServiceItem, ServiceStatus, ChargingUnit } from '../types';
import { CHARGING_UNITS } from '../data/mockData';
import { formatCurrency } from '../utils/storage';
import { getTodayISO as getTodayISOLocal } from '../utils/dateHelpers';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: ServiceItem) => void;
  editingService?: ServiceItem | null;
  initialDate?: string;
  defaultCommissionRate: number;
  // Usado quando o formulário é pré-preenchido a partir de uma nota do CRM (aba "Serviços
  // Agendados"): tecnicamente é um lançamento novo (ainda não existe na tabela do colaborador),
  // então o cabeçalho não deve dizer "EDITAR". Os campos continuam totalmente editáveis —
  // o colaborador pode ajustar o preço ou qualquer outro dado antes de salvar.
  headerOverride?: { title: string; subtitle: string };
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingService,
  initialDate,
  defaultCommissionRate,
  headerOverride,
}) => {
  const getTodayISO = () => getTodayISOLocal();

  const [date, setDate] = useState(getTodayISO());
  const [clientName, setClientName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [unit, setUnit] = useState<ChargingUnit | string>('unidade');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [productionValue, setProductionValue] = useState<number | ''>('');
  const [commissionPercent, setCommissionPercent] = useState<number | ''>(defaultCommissionRate);
  const [commissionValue, setCommissionValue] = useState<number | ''>('');
  const [status, setStatus] = useState<ServiceStatus>('CONCLUÍDO');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingService) {
      setDate(editingService.date || getTodayISO());
      setClientName(editingService.clientName || '');
      setVehicle(editingService.vehicle || '');
      setServiceType(editingService.serviceType || '');
      setUnit(editingService.unit || 'unidade');
      setQuantity(editingService.quantity || 1);
      setUnitPrice(editingService.unitPrice || editingService.productionValue || '');
      setProductionValue(editingService.productionValue);
      setCommissionPercent(editingService.commissionPercent);
      setCommissionValue(editingService.commissionValue);
      setStatus(editingService.status || 'CONCLUÍDO');
      setNotes(editingService.notes || '');
    } else {
      setDate(initialDate || getTodayISO());
      setClientName('');
      setVehicle('');
      setServiceType('');
      setUnit('unidade');
      setQuantity(1);
      setUnitPrice('');
      setProductionValue('');
      setCommissionPercent(defaultCommissionRate);
      setCommissionValue('');
      setStatus('CONCLUÍDO');
      setNotes('');
    }
    setErrors({});
  }, [editingService, isOpen, defaultCommissionRate, initialDate]);

  // Recalculate totals when quantity or unit price changes
  const handleQuantityOrPriceChange = (newQty: number, newUnitPrice: number | '') => {
    setQuantity(newQty);
    setUnitPrice(newUnitPrice);

    if (typeof newUnitPrice === 'number' && newUnitPrice >= 0 && newQty > 0) {
      const totalProd = Number((newQty * newUnitPrice).toFixed(2));
      setProductionValue(totalProd);

      const rate = typeof commissionPercent === 'number' ? commissionPercent : defaultCommissionRate;
      setCommissionValue(Number(((totalProd * rate) / 100).toFixed(2)));
    } else if (typeof productionValue === 'number') {
      const rate = typeof commissionPercent === 'number' ? commissionPercent : defaultCommissionRate;
      setCommissionValue(Number(((productionValue * rate) / 100).toFixed(2)));
    }
  };

  // Direct manual entry for total production value
  const handleProductionValueChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setProductionValue('');
      setCommissionValue('');
    } else {
      setProductionValue(num);
      if (quantity > 0) {
        setUnitPrice(Number((num / quantity).toFixed(2)));
      }
      const rate = typeof commissionPercent === 'number' ? commissionPercent : defaultCommissionRate;
      setCommissionValue(Number(((num * rate) / 100).toFixed(2)));
    }
  };

  const handleCommissionPercentChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setCommissionPercent('');
      setCommissionValue('');
    } else {
      setCommissionPercent(num);
      const prod = typeof productionValue === 'number' ? productionValue : 0;
      setCommissionValue(Number(((prod * num) / 100).toFixed(2)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};
    if (!serviceType.trim()) newErrors.serviceType = 'Descrição do serviço é obrigatória';
    if (typeof productionValue !== 'number' || productionValue <= 0) {
      newErrors.productionValue = 'Informe um valor de produção válido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const prodVal = typeof productionValue === 'number' ? productionValue : 0;
    const commPct = typeof commissionPercent === 'number' ? commissionPercent : 10;
    const commVal = typeof commissionValue === 'number' ? commissionValue : (prodVal * commPct) / 100;

    const itemToSave: ServiceItem = {
      id: editingService ? editingService.id : `srv-${Date.now()}`,
      date: date || getTodayISO(),
      serviceType: serviceType.trim(),
      unit,
      quantity,
      unitPrice: typeof unitPrice === 'number' ? unitPrice : prodVal,
      productionValue: prodVal,
      commissionPercent: commPct,
      commissionValue: commVal,
      status,
      notes: notes.trim(),
      createdAt: editingService ? editingService.createdAt : Date.now(),
    };

    onSave(itemToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-gradient-to-r from-red-950/40 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-red flex items-center justify-center text-white font-black text-lg shadow-red-glow">
              +
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-[var(--text-main)]">
                {headerOverride ? headerOverride.title : editingService ? 'EDITAR SERVIÇO' : 'LANÇAR NOVO SERVIÇO'}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">
                {headerOverride ? headerOverride.subtitle : 'Informe o serviço e o valor para salvar no histórico'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-sec)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <form id="form-servico" onSubmit={handleSubmit} className="space-y-4">
            
            {/* CORE FIELDS: SERVICE TYPE & VALUE */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[var(--accent-red)]">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> Dados do Lançamento
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Rápido & Direto
                </span>
              </div>

              {/* Service Description Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-main)] mb-1">
                  1. Serviço Realizado *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Envelopamento Teto, Banner 440g, Placa ACM..."
                  value={serviceType}
                  onChange={(e) => {
                    setServiceType(e.target.value);
                    if (errors.serviceType) setErrors({ ...errors, serviceType: '' });
                  }}
                  required
                  autoFocus
                  className={`w-full px-3.5 py-3 rounded-xl border bg-[var(--bg-card)] text-[var(--text-main)] text-sm font-bold focus:outline-none ${
                    errors.serviceType ? 'border-red-500' : 'border-[var(--border-color)] focus:border-[var(--accent-red)]'
                  }`}
                />
                {errors.serviceType && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.serviceType}
                  </p>
                )}
              </div>

              {/* Value Input with Numeric Decimal Keyboard */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-main)] mb-1">
                  2. Valor Total do Serviço (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-extrabold font-mono text-[var(--accent-red)]">
                    R$
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={productionValue}
                    onChange={(e) => handleProductionValueChange(e.target.value)}
                    required
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-[var(--bg-card)] text-[var(--text-main)] font-black text-lg font-mono focus:outline-none ${
                      errors.productionValue ? 'border-red-500' : 'border-[var(--accent-red)] focus:ring-2 focus:ring-[var(--accent-red)]/50'
                    }`}
                  />
                </div>
                {errors.productionValue && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.productionValue}
                  </p>
                )}
              </div>
            </div>

            {/* SECONDARY FIELDS: DATE & NOTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Data do Serviço
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-main)] text-xs font-bold focus:outline-none focus:border-[var(--accent-red)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Observações (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago em PIX, cliente retirou no balcão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--accent-red)]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-sec)] transition-colors cursor-pointer"
              >
                CANCELAR
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-red text-white text-xs font-black tracking-wider uppercase shadow-red-glow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>SALVAR SERVIÇO</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

