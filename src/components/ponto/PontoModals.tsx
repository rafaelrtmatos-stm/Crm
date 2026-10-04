import React, { useState } from 'react';
import { X, Save, AlertTriangle, UserX, Clock, Coffee, LogIn, LogOut, Zap, Users, Sparkles, Check } from 'lucide-react';
import { supabase } from '../../supabase';
import { showAlert } from '../../lib/notify';
import {
  PontoJornada,
  PontoRegistro,
  jornadaDoDia,
  jornadaPadrao,
  toMin,
  hojeStr,
  fmtHM,
  minutosTrabalhados,
} from '../../lib/pontoCalc';
import { ColaboradorOption, FuncionarioItem } from './PontoFuncionarios';

const COMPANY_ID = 'rafa-arts';

const DIAS = [
  { dow: 1, nome: 'Segunda-feira' },
  { dow: 2, nome: 'Terça-feira' },
  { dow: 3, nome: 'Quarta-feira' },
  { dow: 4, nome: 'Quinta-feira' },
  { dow: 5, nome: 'Sexta-feira' },
  { dow: 6, nome: 'Sábado' },
  { dow: 0, nome: 'Domingo' },
];

export const Modal = ({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => (
  <div
    className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className={`w-full ${maxWidth} bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 p-6 space-y-4 text-white`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h4 className="text-base font-black text-white tracking-tight">{title}</h4>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const Field = ({
  label,
  children,
  helpText,
}: {
  label: string;
  children: React.ReactNode;
  helpText?: string;
}) => (
  <label className="block space-y-1">
    <span className="text-xs font-bold text-white/80 block">{label}</span>
    {children}
    {helpText && <span className="text-[11px] text-white/40 block">{helpText}</span>}
  </label>
);

export const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/60 focus:bg-white/10 shadow-xs transition-colors';

export const btnSave =
  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer';

// Modal Novo Funcionário
export function NovoFuncModal({
  colabs,
  onClose,
  onSaved,
}: {
  colabs: ColaboradorOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [colabId, setColabId] = useState('');

  const salvar = async () => {
    if (!numero.trim() || !nome.trim()) {
      showAlert('Informe o número do relógio e o nome.');
      return;
    }
    const { data, error } = await supabase
      .from('ponto_funcionarios')
      .insert({
        company_id: COMPANY_ID,
        numero_relogio: numero.trim(),
        nome_relogio: nome.trim(),
        colaborador_id: colabId || null,
        ativo: true,
      })
      .select('id')
      .single();

    if (error || !data) {
      showAlert(
        error?.code === '23505'
          ? 'Já existe um funcionário com esse número do relógio.'
          : `Erro: ${error?.message}`
      );
      return;
    }
    await supabase
      .from('ponto_jornadas')
      .insert(
        jornadaPadrao().map((j) => ({ ...j, funcionario_id: data.id, vigente_desde: '2000-01-01' }))
      );
    showAlert('Funcionário cadastrado com sucesso!');
    onSaved();
  };

  return (
    <Modal title="Novo Funcionário do Ponto" onClose={onClose}>
      <Field label="Nº do funcionário no relógio (ID de Registro)">
        <input
          className={inputCls}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="ex.: 3"
        />
      </Field>
      <Field label="Nome de exibição / Nome no relógio">
        <input
          className={inputCls}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="ex.: Fabrício Souza"
        />
      </Field>
      <Field
        label="Vincular a um colaborador do sistema (Opcional)"
        helpText="Um colaborador pode estar ativo no ponto mesmo sem possuir conta de login."
      >
        <select
          className={inputCls}
          value={colabId}
          onChange={(e) => setColabId(e.target.value)}
        >
          <option value="">Sem vínculo por enquanto</option>
          {colabs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} {c.cargo ? `(${c.cargo})` : ''}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-[11px] text-white/40">
        A jornada inicial padrão será de segunda a sábado (08:00 às 17:00 com intervalo de 1h). Você
        poderá ajustá-la na aba Jornada.
      </p>
      <button onClick={salvar} className={btnSave}>
        <Save size={14} /> Cadastrar Funcionário
      </button>
    </Modal>
  );
}

// Modal Editar Funcionário
export function EditFuncModal({
  func,
  colabs,
  onClose,
  onSaved,
  buscarFoto,
}: {
  func: FuncionarioItem;
  colabs: ColaboradorOption[];
  onClose: () => void;
  onSaved: () => void;
  buscarFoto: (c: any, tel: string, silencioso?: boolean) => Promise<void>;
}) {
  const [numero, setNumero] = useState(func.numero_relogio);
  const [nome, setNome] = useState(func.nome_relogio || '');
  const [colabId, setColabId] = useState(func.colaborador_id || '');
  const [tol, setTol] = useState(String(func.tolerancia_minutos));
  const [tel, setTel] = useState(func.colaboradores?.telefone_whatsapp || '');

  const salvar = async () => {
    const { error } = await supabase
      .from('ponto_funcionarios')
      .update({
        numero_relogio: numero.trim(),
        nome_relogio: nome.trim() || null,
        colaborador_id: colabId || null,
        tolerancia_minutos: Math.max(0, parseInt(tol, 10) || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', func.id);

    if (error) {
      showAlert(
        error.code === '23505'
          ? 'Já existe outro funcionário com esse número do relógio.'
          : `Erro: ${error.message}`
      );
      return;
    }

    if (colabId) {
      const atual = colabs.find((c) => c.id === colabId);
      const telNovo = tel.replace(/\D/g, '');
      if (telNovo !== (func.colaboradores?.telefone_whatsapp || '')) {
        await supabase
          .from('colaboradores')
          .update({ telefone_whatsapp: telNovo || null })
          .eq('id', colabId);
      }
      if (atual && telNovo && !func.colaboradores?.foto_url) {
        await buscarFoto(atual, telNovo);
      }
    }
    showAlert('Dados do funcionário atualizados.');
    onSaved();
  };

  return (
    <Modal title="Editar Funcionário do Ponto" onClose={onClose}>
      <Field label="Nº no relógio de ponto">
        <input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} />
      </Field>
      <Field label="Nome no relógio / Referência">
        <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
      </Field>
      <Field
        label="Vincular ao colaborador"
        helpText="Colaboradores podem ter ou não conta de login cadastrada no CRM."
      >
        <select
          className={inputCls}
          value={colabId}
          onChange={(e) => setColabId(e.target.value)}
        >
          <option value="">Sem vínculo</option>
          {colabs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} {c.cargo ? `(${c.cargo})` : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="WhatsApp do funcionário (com DDD)">
        <input
          className={inputCls}
          value={tel}
          onChange={(e) => setTel(e.target.value)}
          placeholder="ex.: 93 99999-9999"
          disabled={!colabId}
        />
      </Field>
      <Field label="Tolerância de atraso (minutos)">
        <input
          className={inputCls}
          type="number"
          min={0}
          value={tol}
          onChange={(e) => setTol(e.target.value)}
        />
      </Field>
      <button onClick={salvar} className={btnSave}>
        <Save size={14} /> Salvar Alterações
      </button>
    </Modal>
  );
}

// Modal Lançar / Editar Registro de Ponto
export function RegistroModal({
  ctx,
  onClose,
  onSave,
}: {
  ctx: { funcionario_id: string; data: string; reg: PontoRegistro | null };
  onClose: () => void;
  onSave: (fid: string, data: string, h: Partial<PontoRegistro>) => Promise<void>;
}) {
  const r = ctx.reg;
  const [h, setH] = useState({
    entrada: r?.entrada?.slice(0, 5) || '',
    inicio_intervalo: r?.inicio_intervalo?.slice(0, 5) || '',
    fim_intervalo: r?.fim_intervalo?.slice(0, 5) || '',
    saida: r?.saida?.slice(0, 5) || '',
    observacao: r?.observacao || '',
  });

  const set = (k: keyof typeof h) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setH({ ...h, [k]: e.target.value });

  return (
    <Modal title={`Registro de Ponto • ${ctx.data.split('-').reverse().join('/')}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Entrada">
          <input type="time" className={inputCls} value={h.entrada} onChange={set('entrada')} />
        </Field>
        <Field label="Saída">
          <input type="time" className={inputCls} value={h.saida} onChange={set('saida')} />
        </Field>
        <Field label="Início do intervalo">
          <input
            type="time"
            className={inputCls}
            value={h.inicio_intervalo}
            onChange={set('inicio_intervalo')}
          />
        </Field>
        <Field label="Fim do intervalo">
          <input
            type="time"
            className={inputCls}
            value={h.fim_intervalo}
            onChange={set('fim_intervalo')}
          />
        </Field>
      </div>
      <Field label="Observação / Justificativa">
        <input
          className={inputCls}
          value={h.observacao}
          onChange={set('observacao')}
          placeholder="ex.: esqueceu de bater a saída no relógio"
        />
      </Field>
      <p className="text-[11px] text-white/40">
        Registro manual fica protegido contra sobrescrita automática por arquivos do relógio.
      </p>
      <button onClick={() => onSave(ctx.funcionario_id, ctx.data, h)} className={btnSave}>
        <Save size={14} /> Salvar Registro
      </button>
    </Modal>
  );
}

// Modal Edição em Massa de Registros de Ponto
export function RegistroMassaModal({
  funcionarios,
  data,
  onClose,
  onSave,
}: {
  funcionarios: FuncionarioItem[];
  data: string;
  onClose: () => void;
  onSave: (funcionarioIds: string[], data: string, h: Partial<PontoRegistro>) => Promise<void>;
}) {
  const [h, setH] = useState({
    entrada: '',
    inicio_intervalo: '',
    fim_intervalo: '',
    saida: '',
    observacao: '',
  });
  const [salvando, setSalvando] = useState(false);

  const set = (k: keyof typeof h) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setH((prev) => ({ ...prev, [k]: e.target.value }));

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSave(funcionarios.map((f) => f.id), data, h);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal title={`Editar Ponto em Massa • ${data.split('-').reverse().join('/')}`} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
        <strong>{funcionarios.length} funcionário(s)</strong> selecionado(s). Os horários abaixo serão aplicados a todos.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Entrada">
          <input type="time" className={inputCls} value={h.entrada} onChange={set('entrada')} />
        </Field>
        <Field label="Saída">
          <input type="time" className={inputCls} value={h.saida} onChange={set('saida')} />
        </Field>
        <Field label="Início do intervalo">
          <input type="time" className={inputCls} value={h.inicio_intervalo} onChange={set('inicio_intervalo')} />
        </Field>
        <Field label="Fim do intervalo">
          <input type="time" className={inputCls} value={h.fim_intervalo} onChange={set('fim_intervalo')} />
        </Field>
      </div>

      <Field label="Observação / Justificativa">
        <input
          className={inputCls}
          value={h.observacao}
          onChange={set('observacao')}
          placeholder="ex.: ajuste administrativo"
        />
      </Field>

      <p className="text-[11px] text-white/40">
        Deixe um horário vazio para limpar esse campo nos funcionários selecionados. O ajuste será marcado como manual e protegido contra sobrescrita automática.
      </p>

      <button onClick={salvar} disabled={salvando} className={`${btnSave} ${salvando ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <Save size={14} /> {salvando ? 'Salvando...' : 'Aplicar aos Selecionados'}
      </button>
    </Modal>
  );
}

// Modal Editar Grade de Jornada
export function JornadaEditorModal({
  func,
  jornadas,
  todosFuncionarios = [],
  onClose,
  onSaved,
}: {
  func: FuncionarioItem;
  jornadas: PontoJornada[];
  todosFuncionarios?: FuncionarioItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const hoje = hojeStr();
  const [salvando, setSalvando] = useState(false);
  const [aplicarParaTodos, setAplicarParaTodos] = useState(false);

  // Estados dos horários para preenchimento em massa
  const [massaEntrada, setMassaEntrada] = useState('08:00');
  const [massaInicioInt, setMassaInicioInt] = useState('12:00');
  const [massaFimInt, setMassaFimInt] = useState('13:00');
  const [massaSaida, setMassaSaida] = useState('17:00');
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>(DIAS.map((d) => d.dow));

  const [rows, setRows] = useState(() =>
    DIAS.map(({ dow, nome }) => {
      // Busca a jornada salva mais recente para este dia da semana (independente da data de hoje)
      const cand = jornadas
        .filter((x) => x.dia_semana === dow)
        .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde));
      const j = cand[0];

      return {
        dow,
        nome,
        trabalha: j !== undefined ? j.trabalha : dow !== 0,
        entrada: j?.entrada?.slice(0, 5) || '08:00',
        inicio_intervalo: j?.inicio_intervalo?.slice(0, 5) || '12:00',
        fim_intervalo: j?.fim_intervalo?.slice(0, 5) || '13:00',
        saida: j?.saida?.slice(0, 5) || '17:00',
      };
    })
  );

  const up = (i: number, k: string, v: any) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  // Cálculo dinâmico das horas de cada dia
  const calcRowMin = (r: typeof rows[0]) => {
    if (!r.trabalha) return 0;
    return minutosTrabalhados({
      entrada: r.entrada ? `${r.entrada}:00` : null,
      inicio_intervalo: r.inicio_intervalo ? `${r.inicio_intervalo}:00` : null,
      fim_intervalo: r.fim_intervalo ? `${r.fim_intervalo}:00` : null,
      saida: r.saida ? `${r.saida}:00` : null,
    });
  };

  const totalSemanalMin = rows.reduce((acc, r) => acc + calcRowMin(r), 0);
  const diasTrabalhoCount = rows.filter((r) => r.trabalha).length;
  const mediaDiariaMin = diasTrabalhoCount > 0 ? Math.round(totalSemanalMin / diasTrabalhoCount) : 0;
  // Mês padrão CLT ~ 4.333 semanas
  const estimativaMensalMin = Math.round(totalSemanalMin * 4.3333);

  // Ações de preenchimento em massa
  const aplicarDiasSelecionados = () => {
    if (diasSelecionados.length === 0) {
      showAlert('Selecione pelo menos um dia para aplicar o horário.');
      return;
    }
    setRows((prev) => prev.map((r) => diasSelecionados.includes(r.dow) ? ({ ...r, trabalha: true, entrada: massaEntrada, inicio_intervalo: massaInicioInt, fim_intervalo: massaFimInt, saida: massaSaida }) : r));
    showAlert(`Horário aplicado para ${diasSelecionados.length} dia(s) da semana.`);
  };

  const alternarDiaSelecionado = (dow: number) => setDiasSelecionados((prev) => prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]);
  const selecionarTodosOsDias = () => setDiasSelecionados(DIAS.map((d) => d.dow));
  const limparSelecaoDias = () => setDiasSelecionados([]);

  const aplicarMassaSegSex = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.dow >= 1 && r.dow <= 5) {
          return {
            ...r,
            trabalha: true,
            entrada: massaEntrada,
            inicio_intervalo: massaInicioInt,
            fim_intervalo: massaFimInt,
            saida: massaSaida,
          };
        }
        return { ...r, trabalha: false };
      })
    );
    showAlert('Horários aplicados de Segunda a Sexta!');
  };

  const aplicarMassaSegSab = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.dow >= 1 && r.dow <= 6) {
          return {
            ...r,
            trabalha: true,
            entrada: massaEntrada,
            inicio_intervalo: massaInicioInt,
            fim_intervalo: massaFimInt,
            saida: massaSaida,
          };
        }
        return { ...r, trabalha: false };
      })
    );
    showAlert('Horários aplicados de Segunda a Sábado!');
  };

  const aplicarPresetCLT44 = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.dow >= 1 && r.dow <= 5) {
          return {
            ...r,
            trabalha: true,
            entrada: '08:00',
            inicio_intervalo: '12:00',
            fim_intervalo: '13:00',
            saida: '17:00',
          };
        }
        if (r.dow === 6) {
          // Sábado 4 horas
          return {
            ...r,
            trabalha: true,
            entrada: '08:00',
            inicio_intervalo: '',
            fim_intervalo: '',
            saida: '12:00',
          };
        }
        return { ...r, trabalha: false };
      })
    );
    showAlert('Preset CLT 44h aplicado (Seg-Sex 8h + Sáb 4h)!');
  };

  const aplicarPresetComercial40 = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.dow >= 1 && r.dow <= 5) {
          return {
            ...r,
            trabalha: true,
            entrada: '08:00',
            inicio_intervalo: '12:00',
            fim_intervalo: '13:00',
            saida: '17:00',
          };
        }
        return { ...r, trabalha: false };
      })
    );
    showAlert('Preset Comercial 40h aplicado (Seg-Sex 8h)!');
  };

  const aplicarPreset6x1 = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.dow >= 1 && r.dow <= 6) {
          return {
            ...r,
            trabalha: true,
            entrada: '07:20',
            inicio_intervalo: '12:00',
            fim_intervalo: '13:00',
            saida: '16:20',
          };
        }
        return { ...r, trabalha: false };
      })
    );
    showAlert('Preset Escala 6x1 (44h semanais) aplicado!');
  };

  const aplicarPresetTurnoTarde = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.dow >= 1 && r.dow <= 5) {
          return {
            ...r,
            trabalha: true,
            entrada: '13:00',
            inicio_intervalo: '17:00',
            fim_intervalo: '18:00',
            saida: '22:00',
          };
        }
        return { ...r, trabalha: false };
      })
    );
    showAlert('Preset Turno Tarde 40h aplicado (Seg-Sex 13h-22h)!');
  };

  const salvar = async () => {
    for (const r of rows) {
      if (r.trabalha && (toMin(r.entrada) === null || toMin(r.saida) === null)) {
        showAlert(`${r.nome}: informe horário de entrada e saída válidos.`);
        return;
      }
    }

    setSalvando(true);
    try {
      const n = (v: string) => (v ? `${v}:00`.slice(0, 8) : null);

      // Determina quais funcionários receberão a atualização
      let targetFuncIds = [func.id];
      if (aplicarParaTodos) {
        if (todosFuncionarios && todosFuncionarios.length > 0) {
          targetFuncIds = todosFuncionarios.map((f) => f.id);
        } else {
          const { data: allF } = await supabase.from('ponto_funcionarios').select('id');
          if (allF && allF.length > 0) {
            targetFuncIds = allF.map((f) => f.id);
          }
        }
      }

      // Prepara os 7 registros para cada funcionário
      const allRowsToUpsert = targetFuncIds.flatMap((targetId) =>
        rows.map((r) => ({
          funcionario_id: targetId,
          dia_semana: r.dow,
          trabalha: r.trabalha,
          entrada: r.trabalha ? n(r.entrada) : null,
          inicio_intervalo: r.trabalha ? n(r.inicio_intervalo) : null,
          fim_intervalo: r.trabalha ? n(r.fim_intervalo) : null,
          saida: r.trabalha ? n(r.saida) : null,
        }))
      );

      // 1. Grava na vigência base ('2000-01-01') garantindo que funcione de imediato e retroativamente
      const { error: err1 } = await supabase.from('ponto_jornadas').upsert(
        allRowsToUpsert.map((item) => ({ ...item, vigente_desde: '2000-01-01' })),
        { onConflict: 'funcionario_id,dia_semana,vigente_desde' }
      );

      // 2. Grava também com a vigência de hoje para históricos
      await supabase.from('ponto_jornadas').upsert(
        allRowsToUpsert.map((item) => ({ ...item, vigente_desde: hoje })),
        { onConflict: 'funcionario_id,dia_semana,vigente_desde' }
      );

      if (err1) {
        showAlert(`Erro ao salvar no banco de dados: ${err1.message}`);
        setSalvando(false);
        return;
      }

      // Persistência local de segurança
      try {
        targetFuncIds.forEach((tId) => {
          localStorage.setItem(
            `rpro_ponto_jornada_${tId}`,
            JSON.stringify(
              rows.map((r) => ({
                funcionario_id: tId,
                dia_semana: r.dow,
                trabalha: r.trabalha,
                entrada: r.trabalha ? n(r.entrada) : null,
                inicio_intervalo: r.trabalha ? n(r.inicio_intervalo) : null,
                fim_intervalo: r.trabalha ? n(r.fim_intervalo) : null,
                saida: r.trabalha ? n(r.saida) : null,
              }))
            )
          );
        });
      } catch (e) {}

      if (aplicarParaTodos && targetFuncIds.length > 1) {
        showAlert(
          `Sucesso! Grade de jornada aplicada para TODOS os ${targetFuncIds.length} colaboradores (${fmtHM(totalSemanalMin)} semanais)!`
        );
      } else {
        showAlert(`Jornada salva com sucesso! Carga semanal: ${fmtHM(totalSemanalMin)}`);
      }
      onSaved();
    } catch (e: any) {
      showAlert(`Erro ao salvar: ${e?.message || 'Falha inesperada'}`);
    } finally {
      setSalvando(false);
    }
  };

  const totalFuncionariosCount = todosFuncionarios.length || 'todos os';

  return (
    <Modal title={`Jornada Semanal • ${func.colaboradores?.nome || func.nome_relogio || `Funcionário ${func.numero_relogio}`}`} onClose={onClose} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* Painel de Indicadores da Jornada (Diária, Semanal e Mensal em tempo real) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-white/10">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 font-bold uppercase block">Carga Semanal</span>
            <p className="text-base font-black text-white">{fmtHM(totalSemanalMin)}</p>
            <span className="text-[9px] text-white/40 block mt-0.5">Soma dos dias</span>
          </div>

          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <span className="text-[10px] text-sky-400 font-bold uppercase block">Média Diária</span>
            <p className="text-base font-black text-white">{fmtHM(mediaDiariaMin)}</p>
            <span className="text-[9px] text-white/40 block mt-0.5">{diasTrabalhoCount} dias trabalhados</span>
          </div>

          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <span className="text-[10px] text-purple-400 font-bold uppercase block">Estimativa Mês</span>
            <p className="text-base font-black text-white">~{fmtHM(estimativaMensalMin)}</p>
            <span className="text-[9px] text-white/40 block mt-0.5">Base 4,33 semanas</span>
          </div>

          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] text-amber-400 font-bold uppercase block">Escala</span>
            <p className="text-base font-black text-white">{diasTrabalhoCount}x{7 - diasTrabalhoCount}</p>
            <span className="text-[9px] text-white/40 block mt-0.5">{diasTrabalhoCount} trab. / {7 - diasTrabalhoCount} folga</span>
          </div>
        </div>

        {/* Bloco 1: Presets Rápidos com 1 Clique */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" /> Modelos Prontos (1 Clique)
            </span>
            <span className="text-[10px] text-white/40">Preenche a semana toda instantaneamente</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={aplicarPresetCLT44}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Segunda a Sexta (08:00 - 17:00) + Sábado (08:00 - 12:00) = 44h"
            >
              <Sparkles size={12} className="text-emerald-400" /> CLT 44h (Seg-Sex + Sáb 4h)
            </button>

            <button
              type="button"
              onClick={aplicarPresetComercial40}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-white/80 hover:text-sky-300 border border-white/10 hover:border-sky-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Segunda a Sexta (08:00 - 17:00 com 1h intervalo) = 40h"
            >
              <Sparkles size={12} className="text-sky-400" /> Comercial 40h (Seg-Sex)
            </button>

            <button
              type="button"
              onClick={aplicarPreset6x1}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/80 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Segunda a Sábado (07:20 - 16:20) = 44h semanais"
            >
              <Sparkles size={12} className="text-purple-400" /> Escala 6x1 (44h)
            </button>

            <button
              type="button"
              onClick={aplicarPresetTurnoTarde}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/80 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="Segunda a Sexta (13:00 - 22:00 com 1h intervalo) = 40h"
            >
              <Sparkles size={12} className="text-amber-400" /> Turno Tarde (13h-22h)
            </button>
          </div>
        </div>

        {/* Bloco 2: Preenchimento Personalizado em Massa */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-primary-400" /> Preencher Horários em Massa
            </span>
            <span className="text-[10px] text-white/40">Defina os horários e replique para os dias</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/50">Entrada:</span>
              <input
                type="time"
                value={massaEntrada}
                onChange={(e) => setMassaEntrada(e.target.value)}
                className={`${inputCls} w-22 text-xs py-1 px-2`}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/50">Intervalo:</span>
              <input
                type="time"
                value={massaInicioInt}
                onChange={(e) => setMassaInicioInt(e.target.value)}
                className={`${inputCls} w-22 text-xs py-1 px-2`}
              />
              <span className="text-white/30 text-xs">às</span>
              <input
                type="time"
                value={massaFimInt}
                onChange={(e) => setMassaFimInt(e.target.value)}
                className={`${inputCls} w-22 text-xs py-1 px-2`}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/50">Saída:</span>
              <input
                type="time"
                value={massaSaida}
                onChange={(e) => setMassaSaida(e.target.value)}
                className={`${inputCls} w-22 text-xs py-1 px-2`}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={aplicarMassaSegSex}
                className="px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Aplica estes horários para Segunda a Sexta e define Sábado e Domingo como folga"
              >
                <Zap size={12} /> Aplicar Seg a Sex
              </button>
              <button
                type="button"
                onClick={aplicarDiasSelecionados}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Aplica os horários aos dias selecionados acima"
              >
                <Zap size={12} /> Aplicar aos Selecionados
              </button>
              <button
                type="button"
                onClick={aplicarMassaSegSab}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Aplica estes horários para Segunda a Sábado e define Domingo como folga"
              >
                <Zap size={12} /> Aplicar Seg a Sáb
              </button>
            </div>
          </div>
        </div>

        {/* Seleção de dias para aplicação em massa */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black text-white uppercase tracking-wider">Selecionar dias para aplicar</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={selecionarTodosOsDias} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[10px] font-bold border border-white/10 cursor-pointer">Todos os dias</button>
              <button type="button" onClick={limparSelecaoDias} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[10px] font-bold border border-white/10 cursor-pointer">Limpar</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d) => (
              <label key={d.dow} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${diasSelecionados.includes(d.dow) ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'}`}>
                <input type="checkbox" checked={diasSelecionados.includes(d.dow)} onChange={() => alternarDiaSelecionado(d.dow)} className="rounded text-emerald-500 bg-white/10 border-white/20 cursor-pointer" />
                {d.nome.replace('-feira', '')}
              </label>
            ))}
          </div>
          <p className="text-[10px] text-white/40">Você pode editar cada dia diretamente na tabela ou selecionar vários dias e aplicar os horários acima.</p>
        </div>

        {/* Tabela dos 7 Dias com Ajustes Finos Individuais */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="text-white/40 font-semibold border-b border-white/10 text-left">
                <th className="pb-2 pr-3">Dia da Semana</th>
                <th className="pb-2 pr-3 text-center">Trabalha</th>
                <th className="pb-2 pr-3">Entrada</th>
                <th className="pb-2 pr-3">Início int.</th>
                <th className="pb-2 pr-3">Fim int.</th>
                <th className="pb-2 pr-3">Saída</th>
                <th className="pb-2 text-right">Carga Dia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r, i) => {
                const diaMin = calcRowMin(r);
                return (
                  <tr key={r.dow} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{r.nome}</span>
                        {r.dow === 0 && <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/50">Fim de sem.</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.trabalha}
                        onChange={(e) => up(i, 'trabalha', e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-emerald-400 bg-white/10 border-white/20 cursor-pointer"
                      />
                    </td>
                    {(['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida'] as const).map(
                      (k) => (
                        <td key={k} className="py-2.5 pr-3">
                          <input
                            type="time"
                            disabled={!r.trabalha}
                            value={r[k]}
                            onChange={(e) => up(i, k, e.target.value)}
                            className={`${inputCls} w-24 disabled:opacity-20 disabled:bg-white/5`}
                          />
                        </td>
                      )
                    )}
                    <td className="py-2.5 text-right font-mono font-bold">
                      {r.trabalha ? (
                        <span className="text-emerald-400">{fmtHM(diaMin)}</span>
                      ) : (
                        <span className="text-white/30 font-normal">Folga</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bloco 3: Replicar para Todos os Funcionários */}
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="aplicarParaTodosCheckbox"
              checked={aplicarParaTodos}
              onChange={(e) => setAplicarParaTodos(e.target.checked)}
              className="rounded text-purple-500 focus:ring-purple-400 bg-white/10 border-white/20 w-4 h-4 cursor-pointer mt-0.5 sm:mt-0"
            />
            <label htmlFor="aplicarParaTodosCheckbox" className="cursor-pointer">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users size={14} className="text-purple-400" />
                Aplicar e sincronizar esta mesma grade para TODOS os funcionários ({totalFuncionariosCount})
              </span>
              <p className="text-[10px] text-white/50">
                Se marcado, todos os colaboradores da empresa receberão esses mesmos horários contratuais de uma só vez.
              </p>
            </label>
          </div>
          {aplicarParaTodos && (
            <span className="px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-300 text-[10px] font-black uppercase shrink-0 border border-purple-500/40 animate-pulse">
              Em Massa Ativo
            </span>
          )}
        </div>

        <button 
          onClick={salvar} 
          disabled={salvando}
          className={`${btnSave} disabled:opacity-50 cursor-pointer w-full py-2.5`}
        >
          <Save size={15} />{' '}
          {salvando
            ? 'Salvando e sincronizando no sistema...'
            : aplicarParaTodos
            ? `Salvar e Replicar para TODOS (${fmtHM(totalSemanalMin)} semanais)`
            : `Salvar Grade de ${func.colaboradores?.nome || 'Funcionário'} (${fmtHM(totalSemanalMin)} semanais)`}
        </button>
      </div>
    </Modal>
  );
}

// Modal Desativar Funcionário (com confirmação detalhada para garantir preservação do histórico)
export function DesativarConfirmModal({
  func,
  onClose,
  onConfirm,
}: {
  func: FuncionarioItem;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const nome = func.colaboradores?.nome || func.nome_relogio || `Funcionário ${func.numero_relogio}`;

  return (
    <Modal title="Desativar Funcionário do Ponto" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white">Deseja realmente desativar {nome}?</p>
            <p className="text-white/70">
              O funcionário não aparecerá mais na tela operacional de ativos, porém todo o histórico
              de ponto, registros e banco de horas será <b>100% preservado</b>.
            </p>
            <p className="text-white/60">
              Você poderá reativá-lo a qualquer momento em <b>Configurações &gt; Inativos</b>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserX size={14} /> Confirmar Desativação
          </button>
        </div>
      </div>
    </Modal>
  );
}
