export type ServiceStatus = 'CONCLUÍDO' | 'EM PRODUÇÃO' | 'PENDENTE' | 'CANCELADO';

export type ChargingUnit =
  | 'unidade'
  | 'peça'
  | 'serviço'
  | 'veículo'
  | 'moto'
  | 'metro'
  | 'metro quadrado (m²)'
  | 'quantidade';

export interface ServiceItem {
  id: string;
  date: string; // YYYY-MM-DD
  clientName?: string;
  vehicle?: string;
  serviceType: string;
  unit?: ChargingUnit | string;
  quantity?: number;
  unitPrice?: number;
  productionValue: number;
  commissionPercent: number;
  commissionValue: number;
  status: ServiceStatus;
  notes?: string;
  createdAt: number;
}

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface UserSettings {
  userName: string;
  userRole: string;
  baseSalary: number; // Salário Base (ex: R$ 400,00)
  defaultCommissionRate: number; // Ex: 10%
  weeklyGoal: number; // Ex: R$ 2500,00
  themePreference: ThemeMode;
}

export interface FilterOptions {
  dateRange: 'today' | 'week' | 'month' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  statusFilter: 'TODOS' | ServiceStatus;
  searchQuery: string;
}

export interface SummaryStats {
  totalProduction: number;
  totalCommission: number;
  totalBaseSalary: number;
  forecastTotal: number; // Base Salary + Total Commission
  completedCount: number;
  inProductionCount: number;
  pendingCount: number;
  canceledCount: number;
  totalCount: number;
  averageCommissionRate: number;
}
