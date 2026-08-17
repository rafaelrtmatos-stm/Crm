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

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, MessageSquare, Trash2, CheckCircle2, Share2 } from 'lucide-react';
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
}

export default function LeadConversationModal({
  lead,
  funnelGroup,
  onClose,
  onStageChange,
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header com Funil + Dropdown de Etapas */}
      <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-white/10">
        {/* Botão Voltar (Mobile) */}
        <button
          onClick={onClose}
          className="md:hidden p-2 hover:bg-white/10 rounded"
        >
          <X size={20} className="text-white" />
        </button>

        {/* Funil + Etapa (Centro/Esquerda) */}
        <div className="flex-1 flex items-center gap-2 md:gap-3">
          <div className="hidden md:block">
            <h2 className="text-sm font-bold text-white">{lead.funnelName}</h2>
          </div>
          
          {/* Dropdown de Etapas */}
          <StageDropdown
            group={funnelGroup}
            currentStage={lead.currentStage}
            onStageChange={handleStageChange}
            size="sm"
            isSaving={isSaving}
            className="flex-1 md:flex-none"
          />
        </div>

        {/* Menu de Opções (Desktop) */}
        <button className="hidden md:p-2 md:hover:bg-white/10 md:rounded">
          <span className="text-white text-lg">⋯</span>
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 px-3 py-2 bg-slate-900 border-b border-white/10 overflow-x-auto">
        {[
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'notes', icon: Trash2, label: 'Notas' },
          { id: 'tasks', icon: CheckCircle2, label: 'Tarefas' },
          { id: 'saved', icon: Share2, label: 'Salvas' },
          { id: 'sales', icon: MessageSquare, label: 'Vendas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-2 text-[11px] font-bold whitespace-nowrap rounded transition-all ${
              activeTab === tab.id
                ? 'bg-primary-500/30 text-primary-400 border-b-2 border-primary-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba (Scroll) */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && (
          <div className="p-4 space-y-3">
            {/* Chat Content */}
            <div className="space-y-2">
              <div className="bg-slate-800 rounded p-3 text-sm text-white/80">
                Conteúdo do chat será renderizado aqui
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="p-4">
            <div className="bg-slate-800 rounded p-3 text-sm text-white/80">
              Notas será renderizado aqui
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="p-4">
            <div className="bg-slate-800 rounded p-3 text-sm text-white/80">
              Tarefas será renderizado aqui
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="p-4">
            <div className="bg-slate-800 rounded p-3 text-sm text-white/80">
              Mensagens Salvas será renderizado aqui
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="p-4">
            <div className="bg-slate-800 rounded p-3 text-sm text-white/80">
              Vendas será renderizado aqui
            </div>
          </div>
        )}
      </div>

      {/* Input de Mensagem (Fixo no Rodapé) */}
      <div className="bg-slate-800 border-t border-white/10 p-3 flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Escrever uma mensagem..."
          className="flex-1 bg-slate-700 text-white rounded px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button className="p-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-all">
          <MessageSquare size={16} />
        </button>
      </div>
    </div>
  );
}
