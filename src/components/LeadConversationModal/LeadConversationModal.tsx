/**
 * Modal/Tela de Conversa do Lead (Mobile Fullscreen)
 * 
 * Mobile: Abre em tela cheia, some a barra de título
 * Desktop: Mantém divisão lado a lado (já implementada)
 * 
 * Features:
 * - Header com Funil + Dropdown de Etapas
 * - Abas: Chat, Notas, Tarefas, Vendas, Mensagens Salvas
 * - Mesmo padrão do sistema existente
 */

import React, { useState } from 'react';
import { X, MessageSquare, Sticky, CheckCircle2, Share2, Zap } from 'lucide-react';
import { StageDropdown } from '@/components/StatusDropdown';
import type { StageName } from '@/components/StatusDropdown';

interface Lead {
  id: string;
  name: string;
  status: string;
  funnelName: string;
  currentStage: StageName;
}

interface LeadConversationModalProps {
  lead: Lead | null;
  funnelGroup: 'pedidos' | 'orcamentos' | 'contratos';
  onClose: () => void;
  onStageChange: (leadId: string, newStage: StageName) => Promise<void>;
  children?: React.ReactNode; // Conteúdo customizado por aba
}

export default function LeadConversationModal({
  lead,
  funnelGroup,
  onClose,
  onStageChange,
  children,
}: LeadConversationModalProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'tasks' | 'sales' | 'saved'>('chat');
  const [isSaving, setIsSaving] = useState(false);

  if (!lead) return null;

  const handleStageChange = async (newStage: StageName) => {
    setIsSaving(true);
    try {
      await onStageChange(lead.id, newStage);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'notes' as const, icon: Sticky, label: 'Notas' },
    { id: 'tasks' as const, icon: CheckCircle2, label: 'Tarefas' },
    { id: 'saved' as const, icon: Share2, label: 'Salvas' },
    { id: 'sales' as const, icon: Zap, label: 'Vendas' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col md:static md:bg-transparent md:z-auto">
      {/* Header com Funil + Dropdown de Etapas */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-800 border-b border-white/10 flex-shrink-0">
        {/* Botão Voltar (Mobile) */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 -m-1.5 hover:bg-white/10 rounded"
        >
          <X size={18} className="text-white" />
        </button>

        {/* Lead Name (Mobile) */}
        <div className="flex-1 md:hidden text-center">
          <p className="text-xs font-bold text-white">{lead.name}</p>
        </div>

        {/* Spacer */}
        <div className="w-8 md:hidden" />
      </div>

      {/* Funil + Etapa Dropdown */}
      <div className="px-3 py-2 bg-slate-800 border-b border-white/10 flex-shrink-0">
        <StageDropdown
          group={funnelGroup}
          currentStage={lead.currentStage}
          onStageChange={handleStageChange}
          size="md"
          isSaving={isSaving}
          className="w-full"
        />
      </div>

      {/* Abas */}
      <div className="flex gap-1 px-3 py-2 bg-slate-900 border-b border-white/10 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold whitespace-nowrap rounded transition-all flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-primary-500/30 text-primary-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={12} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba (Scroll) */}
      <div className="flex-1 overflow-y-auto">
        {children ? (
          children
        ) : (
          <div className="p-4 space-y-3">
            <div className="bg-slate-800 rounded p-3 text-sm text-white/60 text-center">
              Conteúdo da aba "{activeTab}" será renderizado aqui
            </div>
          </div>
        )}
      </div>

      {/* Input de Mensagem (Fixo no Rodapé) */}
      <div className="bg-slate-800 border-t border-white/10 p-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Escrever uma mensagem..."
          className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
        />
        <button className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all active:scale-95">
          <MessageSquare size={16} />
        </button>
      </div>
    </div>
  );
}
