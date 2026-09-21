import type { AppUser } from '../types';

// Sub-abas de dentro da pagina "Financeiro" (modulo 'comissoes' no menu lateral).
// Usadas em dois lugares: FinanceiroModule (App.tsx) esconde as abas que o usuario nao pode ver, e a
// tela de Usuarios (Modules.tsx) deixa o admin marcar quais abas cada usuario enxerga -- igual as abas do PDV.
export const FINANCEIRO_TABS = [
  { id: 'funcionarios', label: 'Funcionários', desc: 'Colaboradores e comissões' },
  { id: 'materias_primas', label: 'Matérias-Primas', desc: 'Insumos e custo por unidade' },
  { id: 'maquinas', label: 'Máquinas & Equipamentos', desc: 'Custos operacionais e depreciação' },
  { id: 'precificacao', label: 'Precificação', desc: 'Formação automática de preços' },
] as const;

export const ALL_FINANCEIRO_TAB_IDS: string[] = FINANCEIRO_TABS.map(t => t.id);

// Admin ve tudo. Usuario sem a lista salva (ainda nao configurado) tambem ve tudo -- assim ninguem
// perde acesso ao rodar essa atualizacao; so passa a valer quando o admin marca as abas do usuario.
export function canSeeFinanceiroTab(user: Pick<AppUser, 'isAdmin' | 'allowedFinanceiroTabs'> | null | undefined, tabId: string): boolean {
  if (!user || user.isAdmin) return true;
  if (!Array.isArray(user.allowedFinanceiroTabs)) return true;
  return user.allowedFinanceiroTabs.includes(tabId);
}
