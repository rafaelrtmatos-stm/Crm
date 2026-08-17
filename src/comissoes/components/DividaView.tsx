/**
 * Visualização de Dívida com 4 Abas
 * 
 * Mostra dívidas parceladas por:
 * - Semana: Parcelas desta semana
 * - Mês: Parcelas deste mês
 * - Ano: Parcelas deste ano
 * - Total: Dívida total original
 */

import React, { useState, useMemo } from 'react';
import { Desconto } from '../utils/supabaseStorage';
import { formatCurrency } from '../utils/supabaseStorage';

interface DividaViewProps {
  colaboradorId: string;
  descontos: Desconto[];
  periodo: 'semana' | 'mes' | 'ano' | 'custom';
  dateSemanaInicio?: string;
  dateSemanaFim?: string;
}

export default function DividaView({
  colaboradorId,
  descontos,
  periodo,
  dateSemanaInicio,
  dateSemanaFim,
}: DividaViewProps) {
  const [abaSelecionada, setAbaSelecionada] = useState<'semana' | 'mes' | 'ano' | 'total'>('semana');

  // Filtrar apenas dívidas
  const dividas = descontos.filter(d => d.tipo === 'divida' && d.ativo);

  // Calcular totais por período
  const totaisPorPeriodo = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    let totalSemana = 0;
    let totalMes = 0;
    let totalAno = 0;
    let totalGeral = 0;
    const semanaInicio = dateSemanaInicio ? new Date(dateSemanaInicio) : null;
    const semanaFim = dateSemanaFim ? new Date(dateSemanaFim) : null;

    dividas.forEach(divida => {
      const dataDivida = new Date(divida.data);
      const anoDivida = dataDivida.getFullYear();
      const mesDivida = dataDivida.getMonth();

      // Total geral
      totalGeral += divida.valor;

      // Total ano
      if (anoDivida === anoAtual) {
        totalAno += divida.valor;
      }

      // Total mês
      if (anoDivida === anoAtual && mesDivida === mesAtual) {
        totalMes += divida.valor;
      }

      // Total semana
      if (semanaInicio && semanaFim && dataDivida >= semanaInicio && dataDivida <= semanaFim) {
        totalSemana += divida.valor;
      }
    });

    return { totalSemana, totalMes, totalAno, totalGeral };
  }, [dividas, dateSemanaInicio, dateSemanaFim]);

  const abaConteudo = {
    semana: {
      label: 'Semana',
      total: totaisPorPeriodo.totalSemana,
      dividas: dividas.filter(d => {
        if (!dateSemanaInicio || !dateSemanaFim) return false;
        const dataDivida = new Date(d.data);
        const inicio = new Date(dateSemanaInicio);
        const fim = new Date(dateSemanaFim);
        return dataDivida >= inicio && dataDivida <= fim;
      }),
    },
    mes: {
      label: 'Mês',
      total: totaisPorPeriodo.totalMes,
      dividas: dividas.filter(d => {
        const dataDivida = new Date(d.data);
        const hoje = new Date();
        return dataDivida.getFullYear() === hoje.getFullYear() && dataDivida.getMonth() === hoje.getMonth();
      }),
    },
    ano: {
      label: 'Ano',
      total: totaisPorPeriodo.totalAno,
      dividas: dividas.filter(d => {
        const dataDivida = new Date(d.data);
        const hoje = new Date();
        return dataDivida.getFullYear() === hoje.getFullYear();
      }),
    },
    total: {
      label: 'Total',
      total: totaisPorPeriodo.totalGeral,
      dividas: dividas,
    },
  };

  const abaAtual = abaConteudo[abaSelecionada];

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex gap-2 border-b border-white/10">
        {(['semana', 'mes', 'ano', 'total'] as const).map(aba => (
          <button
            key={aba}
            onClick={() => setAbaSelecionada(aba)}
            className={`px-4 py-2 text-sm font-bold transition-all ${
              abaSelecionada === aba
                ? 'text-primary-400 border-b-2 border-primary-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {abaConteudo[aba].label}
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba */}
      <div className="space-y-3">
        {/* Total */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
          <p className="text-xs text-white/60 mb-1">Total da Dívida ({abaAtual.label})</p>
          <p className="text-2xl font-black text-primary-400">
            -R$ {abaAtual.total.toFixed(2)}
          </p>
        </div>

        {/* Lista de Parcelas */}
        {abaAtual.dividas.length > 0 ? (
          <div className="space-y-2">
            {abaAtual.dividas.map(divida => (
              <div key={divida.id} className="bg-slate-800/30 rounded-lg p-3 border border-white/5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">
                      {divida.parcela_atual && divida.parcelas_total
                        ? `Parcela ${divida.parcela_atual}/${divida.parcelas_total}`
                        : 'Dívida'}
                    </p>
                    <p className="text-xs text-white/60">
                      {divida.data}
                      {divida.descricao && ` • ${divida.descricao}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-rose-400">-R$ {divida.valor.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/30 rounded-lg p-4 text-center text-white/60 text-sm">
            Nenhuma dívida neste período
          </div>
        )}
      </div>
    </div>
  );
}
