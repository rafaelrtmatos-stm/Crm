/**
 * Configuração Centralizada de Etapas/Status
 * 
 * Sistema único para todas as classificações (Pedidos, Orçamentos, Contratos, etc)
 * Se alterar aqui, atualiza AUTOMATICAMENTE em todos os lugares!
 */

export type StageName = 
  | 'pedido_recebido'
  | 'aguardando_arte'
  | 'arte_em_desenvolvimento'
  | 'aguardando_aprovacao'
  | 'producao'
  | 'acabamento'
  | 'aguardando_retirada'
  | 'produto_entregue'
  | 'rascunho'
  | 'enviado'
  | 'em_espera'
  | 'aprovado'
  | 'em_producao';

export type StageGroup = 'pedidos' | 'orcamentos' | 'contratos';

export interface StageConfig {
  id: StageName;
  label: string;
  color: 'slate' | 'blue' | 'amber' | 'emerald' | 'rose' | 'purple' | 'cyan' | 'indigo';
  icon: string; // emoji ou nome de icon
}

/**
 * ETAPAS DE PEDIDOS/RECIBOS (8 etapas)
 */
export const STAGES_PEDIDOS: StageConfig[] = [
  { id: 'pedido_recebido', label: 'Pedido Recebido', color: 'blue', icon: '📋' },
  { id: 'aguardando_arte', label: 'Aguardando Arte', color: 'slate', icon: '⏳' },
  { id: 'arte_em_desenvolvimento', label: 'Arte em Desenvolvimento', color: 'cyan', icon: '🎨' },
  { id: 'aguardando_aprovacao', label: 'Aguardando Aprovação', color: 'amber', icon: '⏸️' },
  { id: 'producao', label: 'Produção', color: 'indigo', icon: '🏭' },
  { id: 'acabamento', label: 'Acabamento', color: 'purple', icon: '✨' },
  { id: 'aguardando_retirada', label: 'Aguardando Retirada', color: 'emerald', icon: '📦' },
  { id: 'produto_entregue', label: 'Produto Entregue', color: 'emerald', icon: '✅' },
];

/**
 * ETAPAS DE ORÇAMENTOS (5 etapas)
 */
export const STAGES_ORCAMENTOS: StageConfig[] = [
  { id: 'rascunho', label: 'Rascunho', color: 'slate', icon: '📝' },
  { id: 'enviado', label: 'Enviado', color: 'blue', icon: '📤' },
  { id: 'em_espera', label: 'Em Espera', color: 'amber', icon: '⏳' },
  { id: 'aprovado', label: 'Aprovado', color: 'emerald', icon: '✅' },
  { id: 'em_producao', label: 'Em Produção', color: 'indigo', icon: '🏭' },
];

/**
 * ETAPAS DE CONTRATOS (utiliza as mesmas de Pedidos)
 */
export const STAGES_CONTRATOS = STAGES_PEDIDOS;

/**
 * Map para fácil acesso por grupo
 */
export const STAGES_BY_GROUP: Record<StageGroup, StageConfig[]> = {
  pedidos: STAGES_PEDIDOS,
  orcamentos: STAGES_ORCAMENTOS,
  contratos: STAGES_CONTRATOS,
};

/**
 * Retorna configuração de uma etapa
 */
export function getStageConfig(stageId: StageName, group: StageGroup): StageConfig | undefined {
  return STAGES_BY_GROUP[group].find(s => s.id === stageId);
}

/**
 * Retorna rótulo de uma etapa
 */
export function getStageLabelByGroup(stageId: string, group: StageGroup): string {
  const stage = getStageConfig(stageId as StageName, group);
  return stage?.label || stageId;
}

/**
 * Retorna cor de uma etapa (classe Tailwind)
 */
export function getStageColorClass(stageId: string, group: StageGroup): string {
  const stage = getStageConfig(stageId as StageName, group);
  if (!stage) return 'bg-slate-500/20 text-slate-400';
  
  const colors: Record<string, string> = {
    slate: 'bg-slate-500/20 text-slate-400',
    blue: 'bg-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    rose: 'bg-rose-500/20 text-rose-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
  };
  
  return colors[stage.color] || 'bg-slate-500/20 text-slate-400';
}
