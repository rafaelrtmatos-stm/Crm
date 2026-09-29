import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Eye,
  Pencil,
  UserX,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Link2,
  Trash2,
} from 'lucide-react';
import { AvatarPhoto } from '../SharedUI';

export interface ColaboradorItem {
  id: string;
  nome: string;
  cargo?: string | null;
  foto_url?: string | null;
  telefone_whatsapp?: string | null;
}

export interface FuncionarioItem {
  id: string;
  numero_relogio: string;
  nome_relogio: string;
  colaborador_id: string | null;
  ativo: boolean;
  colaboradores?: ColaboradorItem | null;
  temLogin?: boolean;
  tolerancia_minutos?: number;
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
    <div className="space-y-6 text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Funcionários Ativos
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {funcionariosAtivos.length}
            </span>
          </div>
          <p className="text-xs text-white/50 font-medium mt-0.5">
            Equipe com registro ativo no ponto eletrônico
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, setor ou matrícula..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 shadow-xs focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <button
            onClick={onNovoFuncionario}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wide shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <UserPlus size={15} /> Novo Funcionário
          </button>
        </div>
      </div>

      {/* Grid de Cards de Funcionários */}
      {filtrados.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/10 shadow-xl">
          <p className="text-sm font-bold text-white/80">Nenhum funcionário ativo encontrado</p>
          <p className="text-xs text-white/40 mt-1">
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
                className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Topo do Card: Avatar e Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      <AvatarPhoto
                        photoUrl={f.colaboradores?.foto_url}
                        name={nome}
                        className="w-16 h-16 border-2 border-white/10 shadow-md bg-slate-800"
                        textClassName="text-xl font-black text-white"
                      />
                      <span
                        className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 ring-1 ring-emerald-500/30"
                        title="Ativo no ponto"
                      />
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ATIVO
                      </span>
                      {f.temLogin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          <ShieldCheck size={11} /> Com conta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-white/50 border border-white/10">
                          <ShieldAlert size={11} className="text-white/40" /> Sem conta de login
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações Principais */}
                  <div className="mt-4">
                    <h3 className="font-bold text-white text-base leading-snug group-hover:text-emerald-400 transition-colors">
                      {nome}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-400 mt-0.5">{setor}</p>

                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-white/40 block font-medium">Matrícula</span>
                        <span className="font-bold text-white/90">{matricula}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-white/40 block font-medium">ID Ponto</span>
                        <span className="font-mono font-bold text-white/90 text-[11px]">{idPonto}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé de Ações */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2">
                  <button
                    onClick={() => onAbrirPerfil(f.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Eye size={14} /> Ver Perfil
                  </button>

                  <button
                    onClick={() => onEditarFuncionario(f)}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="Editar informações"
                  >
                    <Pencil size={13} /> Editar
                  </button>

                  <button
                    onClick={() => onDesativarFuncionario(f)}
                    className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl space-y-6 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Funcionários do Ponto
          </h3>
          <p className="text-xs text-white/50 font-medium">
            Gerenciamento administrativo de ativos, inativos e cadastros sem vínculo
          </p>
        </div>

        <button
          onClick={onNovoFuncionario}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase shadow-md transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus size={14} /> Novo Cadastro
        </button>
      </div>

      {/* Abas [Ativos 3] [Inativos 1] [Não vinculados 2] */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 flex-wrap">
        <button
          onClick={() => setTab('ativos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'ativos'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span>Ativos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            tab === 'ativos' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white/60'
          }`}>
            {ativos.length}
          </span>
        </button>

        <button
          onClick={() => setTab('inativos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'inativos'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
              : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span>Inativos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            tab === 'inativos' ? 'bg-rose-500/30 text-rose-200' : 'bg-white/10 text-white/60'
          }`}>
            {inativos.length}
          </span>
        </button>

        <button
          onClick={() => setTab('nao_vinculados')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'nao_vinculados'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <span>Não vinculados</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            tab === 'nao_vinculados' ? 'bg-amber-500/30 text-amber-200' : 'bg-white/10 text-white/60'
          }`}>
            {naoVinculados.length}
          </span>
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar funcionário nesta aba..."
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Tabela de Gestão */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/40 font-semibold border-b border-white/10 text-left uppercase tracking-wider text-[10px]">
              <th className="pb-3 pr-4">Nº Relógio</th>
              <th className="pb-3 pr-4">Funcionário</th>
              <th className="pb-3 pr-4">Vínculo Colaborador</th>
              <th className="pb-3 pr-4">Status Ponto</th>
              <th className="pb-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-white/40">
                  Nenhum funcionário encontrado nesta aba.
                </td>
              </tr>
            ) : (
              filtrados.map((f) => {
                const nome = f.colaboradores?.nome || f.nome_relogio || `Funcionário ${f.numero_relogio}`;
                return (
                  <tr key={f.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 font-mono font-bold text-white/80">
                      {f.numero_relogio}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <AvatarPhoto
                          photoUrl={f.colaboradores?.foto_url}
                          name={nome}
                          className="w-8 h-8 border-white/10"
                          textClassName="text-[11px] font-bold text-white"
                        />
                        <div>
                          <p className="font-bold text-white">{nome}</p>
                          <p className="text-[10px] text-white/40">
                            {f.colaboradores?.cargo || 'Sem setor'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {f.colaborador_id ? (
                        <span className="font-semibold text-emerald-400">
                          {f.colaboradores?.nome || 'Vinculado'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={vinculos[f.id] || ''}
                            onChange={(e) =>
                              setVinculos({ ...vinculos, [f.id]: e.target.value })
                            }
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            <option value="" className="bg-slate-900 text-white">Selecione Colaborador...</option>
                            {colaboradoresDisponiveis.map((c) => (
                              <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                                {c.nome} {c.cargo ? `(${c.cargo})` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={!vinculos[f.id]}
                            onClick={() => onVincularColaborador(f.id, vinculos[f.id])}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black disabled:opacity-40 text-xs transition-colors cursor-pointer"
                          >
                            <Link2 size={12} className="inline mr-1" /> Vincular
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {f.ativo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-white/60 border border-white/10">
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
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 font-bold text-xs cursor-pointer"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => onEditarFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onDesativarFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 font-bold text-xs cursor-pointer"
                            >
                              Desativar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => onReativarFuncionario(f.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck size={12} /> Reativar
                            </button>
                            <button
                              onClick={() => onEditarFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onExcluirFuncionario(f)}
                              className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 font-bold text-xs flex items-center gap-1 cursor-pointer"
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
