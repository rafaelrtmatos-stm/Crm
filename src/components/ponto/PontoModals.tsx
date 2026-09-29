import React, { useState } from 'react';
import { X, Save, AlertTriangle, UserX, Clock, Coffee, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../../supabase';
import { showAlert } from '../../lib/notify';
import {
  PontoJornada,
  PontoRegistro,
  jornadaDoDia,
  jornadaPadrao,
  toMin,
  hojeStr,
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

// Modal Editar Grade de Jornada
export function JornadaEditorModal({
  func,
  jornadas,
  onClose,
  onSaved,
}: {
  func: FuncionarioItem;
  jornadas: PontoJornada[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const hoje = hojeStr();
  const [rows, setRows] = useState(() =>
    DIAS.map(({ dow, nome }) => {
      const j =
        jornadaDoDia(jornadas, hoje) &&
        jornadas
          .filter((x) => x.dia_semana === dow && x.vigente_desde <= hoje)
          .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];

      return {
        dow,
        nome,
        trabalha: j ? j.trabalha : dow !== 0,
        entrada: j?.entrada?.slice(0, 5) || '08:00',
        inicio_intervalo: j?.inicio_intervalo?.slice(0, 5) || '12:00',
        fim_intervalo: j?.fim_intervalo?.slice(0, 5) || '13:00',
        saida: j?.saida?.slice(0, 5) || '17:00',
      };
    })
  );
  const up = (i: number, k: string, v: any) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const salvar = async () => {
    for (const r of rows) {
      if (r.trabalha && (toMin(r.entrada) === null || toMin(r.saida) === null)) {
        showAlert(`${r.nome}: informe entrada e saída.`);
        return;
      }
    }
    const n = (v: string) => (v ? v : null);
    const { error } = await supabase.from('ponto_jornadas').upsert(
      rows.map((r) => ({
        funcionario_id: func.id,
        dia_semana: r.dow,
        trabalha: r.trabalha,
        entrada: r.trabalha ? n(r.entrada) : null,
        inicio_intervalo: r.trabalha ? n(r.inicio_intervalo) : null,
        fim_intervalo: r.trabalha ? n(r.fim_intervalo) : null,
        saida: r.trabalha ? n(r.saida) : null,
        vigente_desde: hoje,
      })),
      { onConflict: 'funcionario_id,dia_semana,vigente_desde' }
    );

    if (error) {
      showAlert(`Erro ao salvar a jornada: ${error.message}`);
      return;
    }
    showAlert('Grade de jornada salva com sucesso!');
    onSaved();
  };

  return (
    <Modal title="Editar Grade Semanal de Jornada" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <p className="text-xs text-white/50">
          A alteração passa a valer a partir de hoje ({hoje.split('-').reverse().join('/')}). Dias
          anteriores continuam calculados com a jornada histórica correspondente.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 font-semibold border-b border-white/10 text-left">
                <th className="pb-2 pr-3">Dia</th>
                <th className="pb-2 pr-3 text-center">Trabalha</th>
                <th className="pb-2 pr-3">Entrada</th>
                <th className="pb-2 pr-3">Início int.</th>
                <th className="pb-2 pr-3">Fim int.</th>
                <th className="pb-2">Saída</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r, i) => (
                <tr key={r.dow} className="hover:bg-white/5 transition-colors">
                  <td className="py-2 pr-3 font-bold text-white">{r.nome}</td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      checked={r.trabalha}
                      onChange={(e) => up(i, 'trabalha', e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-400 bg-white/10 border-white/20"
                    />
                  </td>
                  {(['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida'] as const).map(
                    (k) => (
                      <td key={k} className="py-2 pr-3">
                        <input
                          type="time"
                          disabled={!r.trabalha}
                          value={r[k]}
                          onChange={(e) => up(i, k, e.target.value)}
                          className={`${inputCls} w-24 disabled:opacity-30 disabled:bg-white/5`}
                        />
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={salvar} className={btnSave}>
          <Save size={14} /> Salvar Nova Grade
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
