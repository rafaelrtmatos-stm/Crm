import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, AlertTriangle, UserCheck, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabase';
import { showAlert } from '../../lib/notify';
import { hojeStr, jornadaPadrao } from '../../lib/pontoCalc';
import {
  EstadoFuncionario,
  LeituraArquivo,
  decodificarArquivo,
  lerArquivoRelogio,
  montarPlano,
  normalizarId,
} from '../../lib/pontoImport';
import { ColaboradorOption, FuncionarioItem } from './PontoFuncionarios';
import { Modal, btnSave, inputCls } from './PontoModals';

const COMPANY_ID = 'rafa-arts';
const LOTE = 500;
const PAGINA = 1000; // limite padrão de linhas por consulta do Supabase

const fmtData = (d: string) => d.split('-').reverse().join('/');

/** Lê do banco o que já existe de cada funcionário: data de corte e dias já registrados. */
async function carregarEstado(
  funcs: FuncionarioItem[],
  datas: Map<string, { min: string; max: string }>
): Promise<Map<string, EstadoFuncionario>> {
  const estados = new Map<string, EstadoFuncionario>();
  for (const f of funcs) {
    const faixa = datas.get(f.id);
    if (!faixa) continue;

    const { data: ult, error: e1 } = await supabase
      .from('ponto_registros')
      .select('data')
      .eq('funcionario_id', f.id)
      .eq('origem', 'importacao')
      .order('data', { ascending: false })
      .limit(1);
    if (e1) throw new Error(e1.message);

    const dias = new Set<string>();
    for (let de = 0; ; de += PAGINA) {
      const { data: pag, error: e2 } = await supabase
        .from('ponto_registros')
        .select('data')
        .eq('funcionario_id', f.id)
        .gte('data', faixa.min)
        .lte('data', faixa.max)
        .order('data')
        .range(de, de + PAGINA - 1);
      if (e2) throw new Error(e2.message);
      (pag || []).forEach((r: any) => dias.add(r.data));
      if (!pag || pag.length < PAGINA) break;
    }
    estados.set(f.id, { corte: ult?.[0]?.data ?? null, dias });
  }
  return estados;
}

export function PontoImportModal({
  funcs,
  colabs,
  onClose,
  onFuncionarioCriado,
  onImportado,
}: {
  funcs: FuncionarioItem[];
  colabs: ColaboradorOption[];
  onClose: () => void;
  onFuncionarioCriado: () => Promise<void>;
  onImportado: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<{ nome: string; leitura: LeituraArquivo } | null>(null);
  const [estados, setEstados] = useState<Map<string, EstadoFuncionario>>(new Map());
  const [carregando, setCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [escolha, setEscolha] = useState<Record<string, string>>({}); // enNo -> colaborador_id
  const [associando, setAssociando] = useState<string | null>(null);

  const hoje = hojeStr();

  const escolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    try {
      const leitura = lerArquivoRelogio(decodificarArquivo(await file.arrayBuffer()));
      if (leitura.marcacoes.length === 0) {
        showAlert('Nenhuma marcação reconhecida. Use o arquivo GLogData do relógio de ponto.');
        return;
      }
      setArquivo({ nome: file.name, leitura });
    } catch (err: any) {
      showAlert(`Não foi possível ler o arquivo: ${err?.message || 'formato inválido'}`);
    }
  };

  // Faixa de datas do arquivo por funcionário cadastrado (pra consultar só o necessário no banco).
  const faixas = useMemo(() => {
    const m = new Map<string, { min: string; max: string }>();
    if (!arquivo) return m;
    const porId = new Map<string, { min: string; max: string }>();
    arquivo.leitura.marcacoes.forEach((x) => {
      const a = porId.get(x.enNo);
      if (!a) porId.set(x.enNo, { min: x.data, max: x.data });
      else {
        if (x.data < a.min) a.min = x.data;
        if (x.data > a.max) a.max = x.data;
      }
    });
    funcs.forEach((f) => {
      const a = porId.get(normalizarId(f.numero_relogio));
      if (a) m.set(f.id, a);
    });
    return m;
  }, [arquivo, funcs]);

  useEffect(() => {
    if (!arquivo) return;
    let vivo = true;
    setCarregando(true);
    carregarEstado(funcs, faixas)
      .then((e) => vivo && setEstados(e))
      .catch((err) => vivo && showAlert(`Erro ao consultar o histórico do ponto: ${err.message}`))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [arquivo, funcs, faixas]);

  const plano = useMemo(
    () => (arquivo ? montarPlano(arquivo.leitura.marcacoes, funcs, estados, hoje) : null),
    [arquivo, funcs, estados, hoje]
  );

  const funcPorId = useMemo(() => new Map(funcs.map((f) => [f.id, f])), [funcs]);
  const colabsLivres = useMemo(() => {
    const usados = new Set(funcs.map((f) => f.colaborador_id).filter(Boolean));
    return colabs.filter((c) => !usados.has(c.id));
  }, [funcs, colabs]);

  const totalNovos = plano ? plano.ids.reduce((s, i) => s + i.diasNovos.length, 0) : 0;

  // Associa um ID do relógio a um colaborador já cadastrado (não inventa funcionário).
  const associar = async (enNo: string, nomeArquivo: string) => {
    const colabId = escolha[enNo];
    if (!colabId) {
      showAlert('Escolha o funcionário para associar a esse ID.');
      return;
    }
    setAssociando(enNo);
    try {
      const { data, error } = await supabase
        .from('ponto_funcionarios')
        .insert({
          company_id: COMPANY_ID,
          numero_relogio: enNo,
          nome_relogio: nomeArquivo || null,
          colaborador_id: colabId,
          ativo: true,
        })
        .select('id')
        .single();
      if (error || !data) {
        showAlert(
          error?.code === '23505'
            ? 'Esse ID do relógio já está cadastrado para outro funcionário.'
            : `Erro ao associar: ${error?.message}`
        );
        return;
      }
      await supabase
        .from('ponto_jornadas')
        .insert(jornadaPadrao().map((j) => ({ ...j, funcionario_id: data.id, vigente_desde: '2000-01-01' })));
      await onFuncionarioCriado();
    } finally {
      setAssociando(null);
    }
  };

  const importar = async () => {
    if (!plano || totalNovos === 0) return;
    setImportando(true);
    let gravados = 0;
    try {
      for (const id of plano.ids) {
        const linhas = id.diasNovos.map((d) => ({
          funcionario_id: d.funcionario_id,
          data: d.data,
          entrada: d.entrada,
          inicio_intervalo: d.inicio_intervalo,
          fim_intervalo: d.fim_intervalo,
          saida: d.saida,
          observacao: d.observacao,
          origem: 'importacao',
          editado_manual: false,
        }));
        for (let i = 0; i < linhas.length; i += LOTE) {
          // ignoreDuplicates = "on conflict do nothing": o banco nunca troca um dia que já existe.
          const { data, error } = await supabase
            .from('ponto_registros')
            .upsert(linhas.slice(i, i + LOTE), { onConflict: 'funcionario_id,data', ignoreDuplicates: true })
            .select('id');
          if (error) throw new Error(error.message);
          gravados += data?.length ?? 0;
        }
      }
      showAlert(
        gravados > 0
          ? `Importação concluída: ${gravados} dia(s) novo(s). Registros anteriores foram mantidos.`
          : 'Nenhum dia novo para importar. Todos os registros já estavam no sistema.'
      );
      await onImportado();
    } catch (err: any) {
      showAlert(`Erro na importação (${gravados} dia(s) já gravados, nada foi sobrescrito): ${err?.message}`);
      await onImportado();
    } finally {
      setImportando(false);
    }
  };

  return (
    <Modal title="Importar arquivo do relógio de ponto" onClose={onClose} maxWidth="max-w-4xl">
      <input ref={inputRef} type="file" accept=".txt,.dat,.csv" className="hidden" onChange={escolherArquivo} />

      <div className="flex items-start gap-2 text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <span>
          A importação só acrescenta dias novos, depois do último dia já importado de cada funcionário. Registros
          antigos e correções feitas à mão nunca são substituídos, e nada é apagado.
        </span>
      </div>

      {!arquivo || !plano ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-8 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-white/5 text-white/70 text-xs font-bold transition-colors cursor-pointer"
        >
          <Upload size={16} /> Escolher arquivo (GLogData_*.txt)
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/60">
            <span>
              <span className="font-bold text-white">{arquivo.nome}</span> • {arquivo.leitura.marcacoes.length}{' '}
              marcações lidas
            </span>
            <button
              onClick={() => inputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer"
            >
              Trocar arquivo
            </button>
          </div>

          <div className="max-h-[45vh] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 font-semibold border-b border-white/10 text-left">
                  <th className="pb-2 pr-3">ID</th>
                  <th className="pb-2 pr-3">Nome no arquivo</th>
                  <th className="pb-2 pr-3">Funcionário no sistema</th>
                  <th className="pb-2 pr-3 text-right">Dias no arquivo</th>
                  <th className="pb-2 pr-3 text-right">Já consolidados</th>
                  <th className="pb-2 text-right">Novos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {plano.ids.map((i) => {
                  const f = i.funcId ? funcPorId.get(i.funcId) : null;
                  const nomeSis = f ? f.colaboradores?.nome || f.nome_relogio || `Funcionário ${f.numero_relogio}` : null;
                  return (
                    <tr key={i.enNo} className="align-top">
                      <td className="py-2.5 pr-3 font-mono text-white/60">{i.enNo.padStart(3, '0')}</td>
                      <td className="py-2.5 pr-3 text-white/70">{i.nomeArquivo || '—'}</td>
                      <td className="py-2.5 pr-3">
                        {f ? (
                          <div>
                            <span className="font-bold text-white">{nomeSis}</span>
                            {!f.ativo && <span className="ml-2 text-[10px] text-rose-300">inativo</span>}
                            {f.colaborador_id === null && (
                              <span className="ml-2 text-[10px] text-amber-300">sem vínculo com colaborador</span>
                            )}
                            {i.corte && (
                              <p className="text-[10px] text-white/40">Corte: {fmtData(i.corte)}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="flex items-center gap-1 font-bold text-amber-300">
                              <AlertTriangle size={12} /> Funcionário não identificado
                            </span>
                            <div className="flex items-center gap-1.5">
                              <select
                                className={`${inputCls} py-1`}
                                value={escolha[i.enNo] || ''}
                                onChange={(e) => setEscolha({ ...escolha, [i.enNo]: e.target.value })}
                              >
                                <option value="">Associar a…</option>
                                {colabsLivres.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </select>
                              <button
                                disabled={associando === i.enNo}
                                onClick={() => associar(i.enNo, i.nomeArquivo)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] disabled:opacity-50 cursor-pointer shrink-0"
                              >
                                <UserCheck size={12} /> Associar
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-white/70">{i.diasNoArquivo}</td>
                      <td className="py-2.5 pr-3 text-right text-white/70">{f ? i.diasPreservados : '—'}</td>
                      <td className="py-2.5 text-right font-black text-emerald-300">{f ? i.diasNovos.length : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(plano.idInvalido > 0 || plano.dataInvalida > 0 || plano.duplicadas > 0) && (
            <p className="text-[11px] text-white/40">
              Ignorado:{' '}
              {[
                plano.idInvalido > 0 && `${plano.idInvalido} marcações com ID inválido do relógio (65535)`,
                plano.dataInvalida > 0 && `${plano.dataInvalida} com data inválida (relógio desconfigurado)`,
                plano.duplicadas > 0 && `${plano.duplicadas} batidas duplicadas`,
              ]
                .filter(Boolean)
                .join(' • ')}
              .
            </p>
          )}

          <button onClick={importar} disabled={importando || carregando || totalNovos === 0} className={`${btnSave} disabled:opacity-50`}>
            <Upload size={14} />
            {carregando
              ? 'Conferindo histórico...'
              : importando
              ? 'Importando...'
              : totalNovos === 0
              ? 'Nenhum dia novo para importar'
              : `Importar ${totalNovos} dia(s) novo(s)`}
          </button>
        </>
      )}
    </Modal>
  );
}
