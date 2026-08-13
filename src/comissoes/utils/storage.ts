import { ServiceItem, UserSettings, SummaryStats } from '../types';
import { DEFAULT_USER_SETTINGS, INITIAL_SERVICES } from '../data/mockData';

const SERVICES_KEY = 'prod_comm_services_v1';
const SETTINGS_KEY = 'prod_comm_settings_v1';

export const getServicesFromStorage = (): ServiceItem[] => {
  try {
    const data = localStorage.getItem(SERVICES_KEY);
    if (!data) {
      localStorage.setItem(SERVICES_KEY, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading services from localStorage:', error);
    return INITIAL_SERVICES;
  }
};

export const saveServicesToStorage = (services: ServiceItem[]): void => {
  try {
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  } catch (error) {
    console.error('Error saving services to localStorage:', error);
  }
};

export const getSettingsFromStorage = (): UserSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_USER_SETTINGS));
      return DEFAULT_USER_SETTINGS;
    }
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
    return DEFAULT_USER_SETTINGS;
  }
};

export const saveSettingsToStorage = (settings: UserSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};

export const resetAllData = (): { services: ServiceItem[]; settings: UserSettings } => {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(INITIAL_SERVICES));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_USER_SETTINGS));
  return {
    services: INITIAL_SERVICES,
    settings: DEFAULT_USER_SETTINGS,
  };
};

export const calculateSummaryStats = (services: ServiceItem[], baseSalary: number): SummaryStats => {
  // Exclude CANCELADO from financial totals, count CONCLUÍDO, EM PRODUÇÃO, PENDENTE in total production
  const validServices = services.filter((s) => s.status !== 'CANCELADO');

  const totalProduction = validServices.reduce((acc, s) => acc + (s.productionValue || 0), 0);
  const totalCommission = validServices.reduce((acc, s) => acc + (s.commissionValue || 0), 0);
  const forecastTotal = baseSalary + totalCommission;

  const completedCount = services.filter((s) => s.status === 'CONCLUÍDO' || (s as any).status === 'APROVADO' || (s as any).status === 'PAGO').length;
  const inProductionCount = services.filter((s) => s.status === 'EM PRODUÇÃO').length;
  const pendingCount = services.filter((s) => s.status === 'PENDENTE').length;
  const canceledCount = services.filter((s) => s.status === 'CANCELADO').length;

  const averageCommissionRate =
    totalProduction > 0 ? (totalCommission / totalProduction) * 100 : 0;

  return {
    totalProduction,
    totalCommission,
    totalBaseSalary: baseSalary,
    forecastTotal,
    completedCount,
    inProductionCount,
    pendingCount,
    canceledCount,
    totalCount: services.length,
    averageCommissionRate,
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const applyThemeToDocument = (theme: 'dark' | 'light' | 'auto'): void => {
  const root = document.documentElement;
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    if (prefersDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  } else {
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }
};
