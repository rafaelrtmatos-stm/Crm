import { ServiceItem, UserSettings, ChargingUnit } from '../types';

export const CHARGING_UNITS: ChargingUnit[] = [
  'unidade',
  'peça',
  'serviço',
  'veículo',
  'moto',
  'metro',
  'metro quadrado (m²)',
  'quantidade',
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  userName: 'João Silva',
  userRole: 'Especialista em Comunicação Visual & Adesivação',
  baseSalary: 400.0,
  defaultCommissionRate: 10.0,
  weeklyGoal: 3000.0,
  themePreference: 'dark',
};

// Helper to format date string YYYY-MM-DD offset from today
const getOffsetDateString = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'srv-101',
    date: getOffsetDateString(0), // Hoje
    vehicle: 'Fachada Comercial',
    serviceType: 'Adesivo vidro',
    unit: 'unidade',
    quantity: 1,
    unitPrice: 950.0,
    productionValue: 950.0,
    commissionPercent: 10.0,
    commissionValue: 95.0,
    status: 'CONCLUÍDO',
    notes: 'Adesivo jateado perfurado em fachada.',
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'srv-102',
    date: getOffsetDateString(0), // Hoje
    vehicle: 'Ônibus Executivo',
    serviceType: 'Adesivo ônibus Igor',
    unit: 'unidade',
    quantity: 1,
    unitPrice: 150.0,
    productionValue: 150.0,
    commissionPercent: 10.0,
    commissionValue: 15.0,
    status: 'EM PRODUÇÃO',
    notes: 'Aplicações em andamento.',
    createdAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'srv-103',
    date: getOffsetDateString(-1), // Ontem
    vehicle: 'Honda XRE 300',
    serviceType: 'Moto XRE',
    unit: 'moto',
    quantity: 1,
    unitPrice: 150.0,
    productionValue: 150.0,
    commissionPercent: 10.0,
    commissionValue: 15.0,
    status: 'CONCLUÍDO',
    notes: 'Envelopamento de carenagem preta fosca.',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'srv-104',
    date: getOffsetDateString(-2),
    vehicle: 'Placas Promocionais',
    serviceType: 'Banner',
    unit: 'unidade',
    quantity: 4,
    unitPrice: 50.0,
    productionValue: 200.0,
    commissionPercent: 10.0,
    commissionValue: 20.0,
    status: 'CONCLUÍDO',
    notes: '4 banners 1x0.8m com ilhós.',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'srv-105',
    date: getOffsetDateString(-3),
    vehicle: 'Yamaha Lander 250',
    serviceType: 'Lander Vennun',
    unit: 'moto',
    quantity: 1,
    unitPrice: 350.0,
    productionValue: 350.0,
    commissionPercent: 10.0,
    commissionValue: 35.0,
    status: 'CONCLUÍDO',
    notes: 'Kit gráfico personalizado aplicado.',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'srv-106',
    date: getOffsetDateString(-4),
    vehicle: 'Decoração Interna',
    serviceType: 'Quadros Carol',
    unit: 'unidade',
    quantity: 2,
    unitPrice: 80.0,
    productionValue: 160.0,
    commissionPercent: 10.0,
    commissionValue: 16.0,
    status: 'PENDENTE',
    notes: 'Aguardando aprovação / arte.',
    createdAt: Date.now() - 86400000 * 4,
  },
];

