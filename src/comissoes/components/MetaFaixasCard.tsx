import React, { useMemo } from 'react';
import { Target, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { MetaValorItem } from '../types';
import { formatCurrency } from '../utils/storage';

interface MetaFaixasCardProps {
  metasValores?: MetaValorItem[];
  metaValorMinimo?: number;
  metaValorMaximo?: number;
  // Receita da loja na semana (notas 100% quitadas, Sábado a Sexta) -- mesma base
  // usada por calcularRemuneracaoSemanal para escolher a faixa.
  receitaLoja: number;
}

type Situacao = 'atingida' | 'atual' | 'proxima' | 'futura';

/**
 * Escala completa de metas do colaborador na modalidade META: mostra todos os degraus,
 * o quanto ele recebe em cada um e em qual está agora. As regras (piso mínimo, teto,
 * "maior faixa atingida vale") espelham calcularRemuneracaoSemanal.
 */
export const MetaFaixasCard: React.FC<MetaFaixasCardProps> = ({
  metasValores,
  metaValorMinimo,
  metaValorMaximo,
  receitaLoja,
}) => {
  const info = useMemo(() => {
    const piso = Number(metaValorMinimo) > 0 ? Number(metaValorMinimo) : 600;
    const teto = Number(metaValorMaximo) > 0 ? Number(metaValorMaximo) : 0;

    const faixas = (metasValores || [])
      .filter((m) => Number(m.valorProducao) > 0 && Number(m.valorReceber) > 0)
      .sort((a, b) => Number(a.valorProducao) - Number(b.valorProducao));

    if (faixas.length === 0) return null;

    // Mesmo ajuste do helper: nunca abaixo do piso, nunca acima do teto.
    const valorFinal = (v: number) => {
      let r = Math.max(piso, v);
      if (teto > 0) r = Math.min(r, teto);
      return r;
    };

    let indiceAtual = -1;
    faixas.forEach((f, i) => {
      if (receitaLoja >= Number(f.valorProducao)) indiceAtual = i;
    });

    const linhas = faixas.map((f, i) => {
      let situacao: Situacao;
      if (i < indiceAtual) situacao = 'atingida';
      else if (i === indiceAtual) situacao = 'atual';
      else if (i === indiceAtual + 1) situacao = 'proxima';
      else situacao = 'futura';
      return {
        id: f.id || String(i),
        nome: f.nome || `Faixa ${i + 1}`,
        minimoReceita: Number(f.valorProducao),
        recebe: valorFinal(Number(f.valorReceber)),
        situacao,
        falta: Math.max(0, Number(f.valorProducao) - receitaLoja),
      };
    });

    return {
      piso: valorFinal(piso),
      pisoAtual: indiceAtual === -1,
      primeiraFaixa: Number(faixas[0].valorProducao),
      linhas,
    };
  }, [metasValores, metaValorMinimo, metaValorMaximo, receitaLoja]);

  if (!info) return null;

  return (
    <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-red text-white shrink-0">
            <Target className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-base text-[var(--text-main)]">Escala de metas da semana</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              O que você recebe conforme a receita da loja (notas quitadas, de sábado a sexta).
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] text-[var(--text-muted)] block">Receita da loja agora</span>
          <span className="text-sm font-black font-mono text-[var(--text-main)]">{formatCurrency(receitaLoja)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Piso garantido: vale enquanto nenhuma faixa foi batida */}
        <div
          className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
            info.pisoAtual
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-[var(--bg-card-sec)] border-[var(--border-color)] opacity-70'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck
              className={`w-4 h-4 shrink-0 ${info.pisoAtual ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[var(--text-main)]">Piso garantido</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Receita abaixo de {formatCurrency(info.primeiraFaixa)}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            {info.pisoAtual && <div className="text-[10px] font-black text-emerald-400">Você está aqui</div>}
            <div className="text-sm font-black font-mono text-[var(--text-main)]">{formatCurrency(info.piso)}</div>
          </div>
        </div>

        {info.linhas.map((l) => {
          const estilo =
            l.situacao === 'atual'
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : l.situacao === 'proxima'
                ? 'bg-amber-500/10 border-amber-500/30'
                : l.situacao === 'atingida'
                  ? 'bg-[var(--bg-card-sec)] border-[var(--border-color)]'
                  : 'bg-[var(--bg-card-sec)] border-[var(--border-color)] opacity-70';
          return (
            <div key={l.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${estilo}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                {l.situacao === 'futura' || l.situacao === 'proxima' ? (
                  <Lock
                    className={`w-4 h-4 shrink-0 ${l.situacao === 'proxima' ? 'text-amber-300' : 'text-[var(--text-muted)]'}`}
                  />
                ) : (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${l.situacao === 'atual' ? 'text-emerald-400' : 'text-emerald-500/60'}`}
                  />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[var(--text-main)] truncate">{l.nome}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    A partir de {formatCurrency(l.minimoReceita)} de receita
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                {l.situacao === 'atual' && <div className="text-[10px] font-black text-emerald-400">Você está aqui</div>}
                {l.situacao === 'proxima' && (
                  <div className="text-[10px] font-black text-amber-300">Faltam {formatCurrency(l.falta)}</div>
                )}
                <div className="text-sm font-black font-mono text-[var(--text-main)]">{formatCurrency(l.recebe)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
