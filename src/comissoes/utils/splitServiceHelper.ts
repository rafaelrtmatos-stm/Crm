import { ServiceItem } from '../types';

export type SplitPercentOption = 100 | 50 | 33 | number;

/**
 * Retorna o valor base integral (100%) da produção de um serviço,
 * revertendo divisões prévias caso necessário.
 */
export function getServiceBaseProductionValue(service: ServiceItem): number {
  if (service.baseProductionValue && service.baseProductionValue > 0) {
    return service.baseProductionValue;
  }

  // Verifica se o título ou observação indica que foi dividido previamente
  const text = `${service.serviceType} ${service.notes || ''}`.toLowerCase();
  if (text.includes('(50%') || text.includes('50% meio a meio') || text.includes('dividido em 2')) {
    return Number((service.productionValue * 2).toFixed(2));
  }
  if (text.includes('(33%') || text.includes('dividido em 3')) {
    return Number((service.productionValue * 3).toFixed(2));
  }

  return service.productionValue;
}

/**
 * Aplica a divisão percentual (100%, 50%, 33% ou custom) a um serviço individual.
 */
export function splitSingleService(
  service: ServiceItem,
  splitPct: SplitPercentOption,
  defaultRate = 10
): ServiceItem {
  const original = getServiceBaseProductionValue(service);
  if (original <= 0) return service;

  let multiplier = 1;
  if (splitPct === 50) multiplier = 0.5;
  else if (splitPct === 33) multiplier = 1 / 3;
  else if (splitPct === 100) multiplier = 1;
  else multiplier = splitPct / 100;

  const newProd = Number((original * multiplier).toFixed(2));
  const qty = service.quantity && service.quantity > 0 ? service.quantity : 1;
  const newUnitPrice = Number((newProd / qty).toFixed(2));
  const rate = service.commissionPercent || defaultRate;
  const newComm = Number(((newProd * rate) / 100).toFixed(2));

  // Limpa etiquetas de divisão anteriores do título
  let cleanType = service.serviceType
    .replace(/\s*\((50% meio a meio|50% dividido|50%|33% dividido|33%|100% integral)\)/gi, '')
    .trim();

  // Se for divisão, adiciona etiqueta descritiva sutil
  if (splitPct === 50) {
    cleanType = `${cleanType} (50%)`;
  } else if (splitPct === 33) {
    cleanType = `${cleanType} (33%)`;
  } else if (splitPct !== 100) {
    cleanType = `${cleanType} (${splitPct}%)`;
  }

  return {
    ...service,
    serviceType: cleanType,
    baseProductionValue: original,
    productionValue: newProd,
    unitPrice: newUnitPrice,
    commissionValue: newComm,
  };
}

/**
 * Aplica a divisão percentual a todos os serviços da nota.
 */
export function splitAllServicesInNote(
  services: ServiceItem[],
  splitPct: SplitPercentOption,
  defaultRate = 10
): ServiceItem[] {
  return services.map(s => splitSingleService(s, splitPct, defaultRate));
}
