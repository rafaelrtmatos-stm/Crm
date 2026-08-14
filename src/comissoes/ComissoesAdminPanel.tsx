/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Entrada de "Comissões" pro admin dentro do CRM: em vez de pedir nome/senha de
// colaborador (como em /comissoes), mostra direto a lista de colaboradores
// cadastrados e, ao clicar em um deles, abre o painel completo (Dashboard,
// Semanal, Tabela, Relatórios, Serviços Agendados) sem pedir login nenhum.

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, RefreshCw } from 'lucide-react';
import { Colaborador, getAllColaboradores } from './utils/supabaseStorage';
import ComissoesEmbedded from './ComissoesEmbedded';
import './comissoes-theme.css';

export default function ComissoesAdminPanel() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Colaborador | null>(null);

  useEffect(() => {
    let mounted = true;
    getAllColaboradores().then((list) => {
      if (mounted) { setColaboradores(list); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  if (selected) {
    return (
      <div className="comissoes-app h-full min-h-[420px] flex flex-col">
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para colaboradores
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ComissoesEmbedded presetColaborador={selected} />
        </div>
      </div>
    );
  }

  return (
    <div className="comissoes-app h-full min-h-[420px] bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent-red)]" />
            Comissões — Colaboradores
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Escolha um colaborador para ver o painel completo de produção e comissões.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-[var(--accent-red)]" />
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text-muted)]">Nenhum colaborador cadastrado ainda.</div>
        ) : (
          <div className="space-y-2">
            {colaboradores.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                disabled={!c.ativo}
                className="w-full flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-left hover:border-[var(--accent-red)] transition-colors disabled:opacity-40 disabled:hover:border-[var(--border-color)] disabled:cursor-not-allowed"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[var(--text-main)] truncate">{c.nome}</p>
                    {!c.ativo && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">Inativo</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">{c.cargo || 'Sem cargo definido'} · Comissão padrão {c.comissaoPadraoPercentual || 0}%</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
