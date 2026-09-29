import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Pencil,
  Eye,
  UserX,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Link2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { AvatarPhoto } from '../SharedUI';
import { StatusDia } from '../../lib/pontoCalc';

export interface FuncionarioItem {
  id: string;
  company_id: string;
  numero_relogio: string;
  nome_relogio: string | null;
  colaborador_id: string | null;
  tolerancia_minutos: number;
  ativo: boolean;
  colaboradores?: {
    id: string;
    nome: string;
    cargo?: string | null;
    foto_url: string | null;
    telefone_whatsapp: string | null;
    created_at?: string;
  } | null;
  temLogin: boolean;
  statusHoje?: StatusDia;
  horasHoje?: string;
}

export interface ColaboradorOption {
  id: string;
  nome: string;
  cargo?: string | null;
}

interface PontoFuncionariosProps {
  funcionariosAtivos: FuncionarioItem[];
  onAbrirPerfil: (funcId: string) => void;
  onEditarFuncionario: (func: FuncionarioItem) => void;
  onDesativarFuncionario: (func: FuncionarioItem) => void;
  onNovoFuncionario: () => void;
}

export function PontoFuncionarios({
  funcionariosAtivos,
  onAbrirPerfil,
  onEditarFuncionario,
  onDesativarFuncionario,
  onNovoFuncionario,
}: PontoFuncionariosProps) {
  const [busca, setBusca] = useState('');

  const filtrados = funcionariosAtivos.filter((f) => {
    const nome = (f.colaboradores?.nome || f.nome_relogio || '').toLowerCase();
    const setor = (f.colaboradores?.cargo || '').toLowerCase();
    const matricula = f.numero_relogio.toLowerCase();
    const q = busca.toLowerCase();
    return nome.includes(q) || setor.includes(q) || matricula.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Funcionários Ativos
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              {funcionariosAtivos.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Equipe com registro ativo no ponto eletrônico
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, setor ou matrícula..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          <button
            onClick={onNovoFuncionario}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wide shadow-xs transition-colors shrink-0"
          >
            <UserPlus size={15} /> Novo Funcionário
          </button>
        </div>
      </div>

      {/* Grid de Cards de Funcionários */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <p className="text-sm font-bold text-slate-700">Nenhum funcionário ativo encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            Tente buscar com outro termo ou cadastre um novo funcionário do ponto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtrados.map((f) => {
            const nome = f.colaboradores?.nome || f.nome_relogio || `Funcionário ${f.numero_relogio}`;
            const setor = f.colaboradores?.cargo || 'Operacional / Geral';
            const matricula = String(f.numero_relogio).padStart(3, '0');
            const idPonto = String(f.numero_relogio).padStart(10, '0');

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Topo do Card: Avatar e Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      <AvatarPhoto
                        photoUrl={f.colaboradores?.foto_url}
                        name={nome}
                        className="w-16 h-16 border-2 border-white ring-1 ring-slate-200 shadow-xs"
                        textClassName="text-xl font-black text-slate-700"
                      />
                      <span
                        className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20"
                        title="Ativo no ponto"
                      />
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ATIVO
                      </span>
                      {f.temLogin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          <ShieldCheck size={11} /> Com conta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <ShieldAlert size={11} className="text-slate-400" /> Sem conta de login
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações Principais */}
                  <div className="mt-4">
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors">
                      {nome}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">{setor}</p>

                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Matrícula</span>
                        <span className="font-bold text-slate-700">{matricula}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">ID Ponto</span>
                        <span className="font-mono font-bold text-slate-700 text-[11px]">{idPonto}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé de Ações */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onAbrirPerfil(f.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors"
                  >
                    <Eye size={14} /> Ver Perfil
                  </button>

                  <button
                    onClick={() => onEditarFuncionario(f)}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors"
                    title="Editar informações"
                  >
                    <Pencil size={13} /> Editar
                  </button>

                  <button
                    onClick={() => onDesativarFuncionario(f)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Desativar funcionário"
                  >
                    <UserX size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- CONFIGURAÇÕES: FUNCIONÁRIOS DO PONTO ----------------
interface PontoConfigFuncionariosProps {
  todosFuncionarios: FuncionarioItem[];
  colaboradoresDisponiveis: ColaboradorOption[];
  onAbrirPerfil: (funcId: string) => void;
  onEditarFuncionario: (func: FuncionarioItem) => void;
  onDesativarFuncionario: (func: FuncionarioItem) => void;
  onReativarFuncionario: (funcId: string) => void;
  onExcluirFuncionario: (func: FuncionarioItem) => void;
  onVincularColaborador: (funcId: string, colaboradorId: string) => void;
  onNovoFuncionario: () => void;
}

export function PontoConfigFuncionarios({
  todosFuncionarios,
  colaboradoresDisponiveis,
  onAbrirPerfil,
  onEditarFuncionario,
  onDesativarFuncionario,
  onReativarFuncionario,
  onExcluirFuncionario,
  onVincularColaborador,
  onNovoFuncionario,
}: PontoConfigFuncionariosProps) {
  const [tab, setTab] = useState<'ativos' | 'inativos' | 'nao_vinculados'>('ativos');
  const [busca, setBusca] = useState('');
  const [vinculos, setVinculos] = useState<Record<string, string>>({});

  const ativos = todosFuncionarios.filter((f) => f.ativo && f.colaborador_id !== null);
  const inativos = todosFuncionarios.filter((f) => !f.ativo);
  const naoVinculados = todosFuncionarios.filter((f) => f.colaborador_id === null);

  const listaAtual =
    tab === 'ativos' ? ativos : tab === 'inativos' ? inativos : naoVinculados;

  const filtrados = listaAtual.filter((f) => {
    const nome = (f.colaboradores?.nome || f.nome_relogio || '').toLowerCase();
    const q = busca.toLowerCase();
    return nome.includes(q) || f.numero_relogio.includes(q);
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Funcionários do Ponto
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Gerenciamento administrativo de ativos, inativos e cadastros sem vínculo
          </p>
        </div>

        <button
          onClick={onNovoFuncionario}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus size={14} /> Novo Cadastro
        </button>
      </div>

      {/* Abas [Ativos 3] [Inativos 1] [Não vinculados 2] */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setTab('ativos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'ativos'
              ? 'bg-[#0B3D2B] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Ativos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            tab === 'ativos' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {ativos.length}
          </span>
        </button>

        <button
          onClick={() => setTab('inativos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'inativos'
              ? 'bg-[#0B3D2B] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Inativos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            tab === 'inativos' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {inativos.length}
          </span>
        </button>

        <button
          onClick={() => setTab('nao_vinculados')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'nao_vinculados'
              ? 'bg-[#0B3D2B] text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Não vinculados</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            tab === 'nao_vinculados' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {naoVinculados.length}
          </span>
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar funcionário nesta aba..."
          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Tabela de Gestão */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 font-semibold border-b border-slate-100 text-left">
              <th className="pb-3 pr-4">Nº Relógio</th>
              <th className="pb-3 pr-4">Funcionário</th>
              <th className="pb-3 pr-4">Vínculo Colaborador</th>
              <th className="pb-3 pr-4">Status Ponto</th>
              <th className="pb-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Nenhum funcionário encontrado nesta aba.
                </td>
              </tr>
            ) : (
              filtrados.map((f) => {
                const nome = f.colaboradores?.nome || f.nome_relogio || `Funcionário ${f.numero_relogio}`;
                return (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pr-4 font-mono font-bold text-slate-700">
                      {f.numero_relogio}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <AvatarPhoto
                          photoUrl={f.colaboradores?.foto_url}
                          name={nome}
                          className="w-8 h-8 border-slate-200"
                          textClassName="text-[11px] font-bold"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{nome}</p>
                          <p className="text-[10px] text-slate-400">
                            {f.colaboradores?.cargo || 'Sem setor'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {f.colaborador_id ? (
                        <span className="font-semibold text-emerald-700">
                          {f.colaboradores?.nome || 'Vinculado'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={vinculos[f.id] || ''}
                            onChange={(e) =>
                              setVinculos({ ...vinculos, [f.id]: e.target.value })
                            }
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none"
                          >
                            <option value="">Selecione Colaborador...</option>
                            {colaboradoresDisponiveis.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome} {c.cargo ? `(${c.cargo})` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!vinculos[f.id]}
                            onClick={() => onVincularColaborador(f.id, vinculos[f.id])}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 disabled:opacity-40 text-white font-bold text-xs"
                          >
                            <Link2 size={12} className="inline mr-1" /> Vincular
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {f.ativo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                          INATIVO
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {f.ativo ? (
                          <>
                            <button
                              onClick={() => onAbrirPerfil(f.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => onEditarFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onDesativarFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-xs"
                            >
                              Desativar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => onReativarFuncionario(f.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs flex items-center gap-1"
                            >
                              <UserCheck size={12} /> Reativar
                            </button>
                            <button
                              onClick={() => onEditarFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onExcluirFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
