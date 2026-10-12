import React, { useState } from 'react';
import type { SaleOrder } from '../types';

// Nome de quem pagou o PIX (lido do e-mail do banco), em vermelho e letra pequena, com o botão
// "Atualizar nome na nota". Clicar abre um segundo passo de confirmação (nome atual x nome do PIX, editável,
// e quantas outras notas do mesmo cliente serão alteradas). Ignorar = nada é alterado e o nome continua visível.

export interface PagadorPixBlocoProps {
  order: SaleOrder;
  /** Quantas OUTRAS notas ativas do mesmo cliente (mesmo vínculo ou mesmo telefone) seriam renomeadas. */
  contarOutras: (order: SaleOrder) => Promise<number>;
  /** Grava o nome na nota, no cadastro (cria se não existir) e nas outras notas. true = gravou. */
  aplicar: (order: SaleOrder, nome: string) => Promise<boolean>;
}

export const nomesPagadoresDaNota = (order?: SaleOrder | null): string[] => {
  const nomes = (order?.payments || [])
    .filter((p) => p.method === 'pix' && p.payerName)
    .map((p) => String(p.payerName).trim().toLocaleUpperCase('pt-BR'));
  return Array.from(new Set(nomes));
};

export const PagadorPixBloco: React.FC<PagadorPixBlocoProps> = ({ order, contarOutras, aplicar }) => {
  const [confirmando, setConfirmando] = useState<{ nome: string; outras: number } | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const nomes = nomesPagadoresDaNota(order);
  if (nomes.length === 0) return null;
  const atual = String(order.customerName || '').trim().toLocaleUpperCase('pt-BR');

  const abrir = async (nome: string) => {
    setAlvo(nome);
    let outras = 0;
    try { outras = await contarOutras(order); } catch { /* sem contagem: mostra 0 */ }
    setConfirmando({ nome, outras });
  };

  const confirmar = async () => {
    if (!confirmando || salvando) return;
    setSalvando(true);
    try {
      if (await aplicar(order, confirmando.nome)) setConfirmando(null);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {nomes.map((nome) => (
        <div key={nome} className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold text-red-500 leading-tight">Pagador PIX: {nome}</span>
          {nome !== atual && alvo !== nome && (
            <button
              type="button"
              onClick={() => abrir(nome)}
              className="px-2 py-0.5 rounded-md border border-red-500/60 bg-red-500/10 text-[8px] font-black uppercase tracking-wide text-red-400 hover:bg-red-500/20 cursor-pointer"
            >
              Atualizar nome na nota
            </button>
          )}
        </div>
      ))}

      {confirmando && (
        <div className="p-2 rounded-lg border border-red-500/40 bg-red-500/5 space-y-1.5">
          <p className="text-[9px] text-white/60 font-bold">
            Nome atual: <span className="text-white">{order.customerName || 'Cliente de Balcão'}</span>
          </p>
          <label className="block text-[9px] text-white/60 font-bold">
            Nome do PIX (pode ajustar):
            <input
              value={confirmando.nome}
              onChange={(e) => setConfirmando({ ...confirmando, nome: e.target.value.toLocaleUpperCase('pt-BR') })}
              className="mt-0.5 w-full h-7 bg-slate-900/70 border border-white/10 rounded px-2 text-[10px] text-white uppercase focus:outline-none focus:border-red-500"
            />
          </label>
          <p className="text-[8.5px] text-white/50 leading-snug">
            Atualiza esta nota e o cadastro do cliente
            {confirmando.outras > 0 ? `, e mais ${confirmando.outras} outra${confirmando.outras > 1 ? 's' : ''} nota${confirmando.outras > 1 ? 's' : ''} ativa${confirmando.outras > 1 ? 's' : ''} do mesmo cliente` : ''}.
            Sem cadastro, cria um (com o telefone da nota, se houver).
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={salvando || !confirmando.nome.trim()}
              onClick={confirmar}
              className="px-3 h-6 rounded-md bg-red-600 hover:bg-red-500 text-white text-[8.5px] font-black uppercase tracking-wide cursor-pointer border-0 disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Confirmar atualização'}
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => { setConfirmando(null); setAlvo(null); }}
              className="px-2 h-6 text-[8.5px] font-black uppercase text-white/50 hover:text-white cursor-pointer bg-transparent border-0"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
