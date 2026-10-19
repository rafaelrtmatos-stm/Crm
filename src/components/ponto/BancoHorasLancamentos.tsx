import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../../supabase';
import { showAlert, showConfirm } from '../../lib/notify';
import { fmtHM, hojeStr } from '../../lib/pontoCalc';

// Lançamentos do banco de horas (tabela ponto_banco_horas): minutos negativos = débito (horas que faltam),
// positivos = crédito (horas a mais). Usado no Controle de Ponto e no painel do funcionário; os dois leem e
// gravam a mesma tabela, então qualquer ajuste aparece igual nos dois lugares.

interface Lancamento {
  id: string;
  data: string;
  minutos: number;
  tipo: string;
  validade: string | null;
  observacao: string | null;
}

const TIPO_ROTULO: Record<string, string> = {
  extra: 'Hora extra',
  compensacao: 'Compensação',
  folga: 'Folga',
  pagamento: 'Pagamento',
  ajuste: 'Ajuste manual',
};

/** Crédito vence 6 meses depois da data (mesma regra do restante do banco de horas). */
function validadeDoCredito(data: string): string {
  const d = new Date(`${data}T12:00:00`);
  d.setMonth(d.getMonth() + 6);
  return hojeStr(d);
}

const fmtData = (d: string) => d.split('-').reverse().join('/');

interface Props {
  funcionarioId: string;
  /** Quem pode lançar, editar e apagar. Sem permissão, só mostra o extrato. */
  podeEditar?: boolean;
  /** Chamado depois de salvar/editar/apagar, para a tela de fora recalcular o saldo. */
  onChanged?: () => void | Promise<void>;
}

export function BancoHorasLancamentos({ funcionarioId, podeEditar = true, onChanged }: Props) {
  const [itens, setItens] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTipo, setEditTipo] = useState<string>('ajuste');
  const [sentido, setSentido] = useState<'debito' | 'credito'>('debito');
  const [horas, setHoras] = useState('');
  const [mins, setMins] = useState('');
  const [data, setData] = useState(hojeStr());
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from('ponto_banco_horas')
      .select('id, data, minutos, tipo, validade, observacao')
      .eq('funcionario_id', funcionarioId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      showAlert(`Erro ao carregar o banco de horas: ${error.message}`);
    } else {
      setItens((rows || []) as Lancamento[]);
    }
    setLoading(false);
  }, [funcionarioId]);

  useEffect(() => {
    setLoading(true);
    setAberto(false);
    setEditId(null);
    carregar();
  }, [carregar]);

  const abrirNovo = (s: 'debito' | 'credito' = 'debito') => {
    setEditId(null);
    setEditTipo('ajuste');
    setSentido(s);
    setHoras('');
    setMins('');
    setData(hojeStr());
    setObs('');
    setAberto(true);
  };

  const abrirEdicao = (l: Lancamento) => {
    const abs = Math.abs(l.minutos);
    setEditId(l.id);
    setEditTipo(l.tipo);
    setSentido(l.minutos < 0 ? 'debito' : 'credito');
    setHoras(String(Math.floor(abs / 60)));
    setMins(String(abs % 60));
    setData(l.data);
    setObs(l.observacao || '');
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setEditId(null);
  };

  const salvar = async () => {
    const h = Math.max(0, parseInt(horas || '0', 10) || 0);
    const m = Math.max(0, parseInt(mins || '0', 10) || 0);
    const total = h * 60 + m;
    if (total <= 0) {
      showAlert('Informe quantas horas e minutos.');
      return;
    }
    if (!data) {
      showAlert('Informe a data.');
      return;
    }
    const minutos = sentido === 'debito' ? -total : total;
    const payload = {
      data,
      minutos,
      validade: minutos > 0 ? validadeDoCredito(data) : null,
      observacao: obs.trim() || null,
    };
    setSalvando(true);
    const { error } = editId
      ? await supabase.from('ponto_banco_horas').update({ ...payload, tipo: editTipo }).eq('id', editId)
      : await supabase.from('ponto_banco_horas').insert({ ...payload, funcionario_id: funcionarioId, tipo: 'ajuste' });
    setSalvando(false);
    if (error) {
      showAlert(`Erro ao salvar o lançamento: ${error.message}`);
      return;
    }
    fechar();
    await carregar();
    await onChanged?.();
  };

  const apagar = async (l: Lancamento) => {
    const ok = await showConfirm(
      `Apagar o lançamento de ${l.minutos < 0 ? '-' : '+'}${fmtHM(Math.abs(l.minutos))} do dia ${fmtData(l.data)}?`
    );
    if (!ok) return;
    const { error } = await supabase.from('ponto_banco_horas').delete().eq('id', l.id);
    if (error) {
      showAlert(`Erro ao apagar o lançamento: ${error.message}`);
      return;
    }
    await carregar();
    await onChanged?.();
  };

  const hoje = hojeStr();
  const campo =
    'bg-black/20 border border-white/15 rounded-lg px-2 py-1.5 text-sm text-inherit outline-none focus:border-white/40';
  const btn =
    'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-black">Lançamentos do banco de horas</h4>
        {podeEditar && !aberto && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => abrirNovo('debito')}
              className={`${btn} border-rose-400/40 text-rose-400 hover:bg-rose-400/10`}
            >
              <Plus size={14} /> Horas que faltam
            </button>
            <button
              type="button"
              onClick={() => abrirNovo('credito')}
              className={`${btn} border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10`}
            >
              <Plus size={14} /> Horas a mais
            </button>
          </div>
        )}
      </div>

      {podeEditar && aberto && (
        <div className="rounded-xl border border-white/15 bg-white/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <b className="text-xs uppercase tracking-wider">{editId ? 'Editar lançamento' : 'Novo lançamento'}</b>
            <button type="button" onClick={fechar} className="opacity-60 hover:opacity-100 cursor-pointer" title="Cancelar">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSentido('debito')}
              className={`${btn} ${sentido === 'debito' ? 'bg-rose-500 border-rose-500 text-white' : 'border-white/15 opacity-70'}`}
            >
              Horas que faltam (débito)
            </button>
            <button
              type="button"
              onClick={() => setSentido('credito')}
              className={`${btn} ${sentido === 'credito' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/15 opacity-70'}`}
            >
              Horas a mais (crédito)
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="text-xs opacity-80 space-y-1">
              <span className="block">Horas</span>
              <input
                type="number"
                min={0}
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className={`${campo} w-full`}
                placeholder="0"
              />
            </label>
            <label className="text-xs opacity-80 space-y-1">
              <span className="block">Minutos</span>
              <input
                type="number"
                min={0}
                max={59}
                value={mins}
                onChange={(e) => setMins(e.target.value)}
                className={`${campo} w-full`}
                placeholder="0"
              />
            </label>
            <label className="text-xs opacity-80 space-y-1 col-span-2">
              <span className="block">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={`${campo} w-full`} />
            </label>
          </div>
          <label className="text-xs opacity-80 space-y-1 block">
            <span className="block">Observação (opcional)</span>
            <input
              type="text"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className={`${campo} w-full`}
              placeholder="Ex.: saiu mais cedo, atestado, compensação combinada"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={fechar} className={`${btn} border-white/15`}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className={`${btn} bg-emerald-500 border-emerald-500 text-slate-950 disabled:opacity-50`}
            >
              <Check size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs opacity-60">Carregando lançamentos...</p>
      ) : itens.length === 0 ? (
        <p className="text-xs opacity-60 italic">Nenhum lançamento no banco de horas.</p>
      ) : (
        <ul className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {itens.map((l) => {
            const debito = l.minutos < 0;
            const vencido = !debito && !!l.validade && l.validade < hoje;
            return (
              <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span className="font-mono opacity-70 w-20 shrink-0">{fmtData(l.data)}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-bold">{TIPO_ROTULO[l.tipo] || l.tipo}</span>
                  {l.observacao ? <span className="opacity-60"> · {l.observacao}</span> : null}
                  {vencido ? <span className="text-amber-400"> · vencido</span> : null}
                </span>
                <b className={`shrink-0 ${debito ? 'text-rose-400' : vencido ? 'opacity-50' : 'text-emerald-400'}`}>
                  {debito ? '- ' : '+ '}
                  {fmtHM(Math.abs(l.minutos))}
                </b>
                {podeEditar && (
                  <span className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(l)}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 cursor-pointer"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => apagar(l)}
                      className="p-1.5 rounded-lg text-rose-400 opacity-70 hover:opacity-100 hover:bg-rose-400/10 cursor-pointer"
                      title="Apagar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
