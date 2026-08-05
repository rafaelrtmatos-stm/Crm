import { Timestamp } from 'firebase/firestore';
import { 
  Lead, 
  Conversation, 
  AppUser, 
  Company,
  BaseEntity,
  ServiceContract
} from '../types';

/**
 * SLA Status Logic
 * azul: recém-chegada (< 5 min)
 * verde: dentro do prazo (5-15 min)
 * amarelo: atenção (15-30 min)
 * laranja: atraso (30-60 min)
 * vermelho: crítico (> 60 min)
 */
export function calculateSLA(waitingSince?: Timestamp | string | null): Conversation['slaStatus'] {
  if (!waitingSince) return 'ok';
  
  const now = new Date().getTime();
  const waitingDate = waitingSince instanceof Timestamp ? waitingSince.toDate().getTime() : new Date(waitingSince).getTime();
  const diffMinutes = (now - waitingDate) / (1000 * 60);

  if (diffMinutes < 5) return 'ok'; // Using 'ok' as placeholder for blue/green logic
  if (diffMinutes < 15) return 'ok';
  if (diffMinutes < 30) return 'attention';
  if (diffMinutes < 60) return 'late';
  return 'critical';
}

/**
 * Financial Validation for Service Contract Sale
 * Rules: totalAmount = downPayment + remainingBalance
 */
export function validateServiceContractSale(contract: Partial<ServiceContract>): { isValid: boolean; messages: string[] } {
  const messages: string[] = [];
  const total = contract.totalAmount || 0;
  const down = contract.downPaymentAmount || (total / 2);
  const remaining = total - down;

  if (down < 0 || remaining < 0) {
    messages.push('Valores de entrada ou saldo não podem ser negativos.');
  }

  return {
    isValid: messages.length === 0,
    messages
  };
}

/**
 * Lead Distribution Logic
 * Simple version: Round-robin or specific user assignment
 */
export function distributeLead(company: Company, users: AppUser[]): string | undefined {
  const activeSellers = users.filter(u => u.isActive && (u.role === 'vendedor' || u.role === 'gerente'));
  if (activeSellers.length === 0) return undefined;
  
  // For a real implementation, we would query the last assigned lead and pick the next user
  // For now, random selection as placeholder for "autonomous distribution"
  return activeSellers[Math.floor(Math.random() * activeSellers.length)].id;
}

/**
 * Tracking Extractions
 */
export function extractTracking(params: URLSearchParams): Lead['tracking'] {
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmContent: params.get('utm_content') || undefined,
    utmTerm: params.get('utm_term') || undefined,
    adId: params.get('ad_id') || undefined,
    formId: params.get('form_id') || undefined,
    campaignName: params.get('campaign_name') || undefined,
    adName: params.get('ad_name') || undefined,
  };
}

/**
 * Filter Entities by Company
 */
export function filterByCompany<T extends BaseEntity>(entities: T[], companyId: string): T[] {
  return entities.filter(e => e.companyId === companyId);
}

/**
 * Permission Check
 */
export function canAccessModule(user: AppUser, company: Company, module: string): boolean {
  if (user.isAdmin) return true;
  
  // Check if module is active for the company
  const isModuleActive = company.activeModules?.includes(module);
  if (!isModuleActive) return false;

  // Check if user has permission for that company
  const hasCompanyAccess = user.allowedCompanies?.includes(company.id || '');
  return !!hasCompanyAccess;
}
