import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Users,
  Search,
  RefreshCw,
  Zap,
  AlertTriangle,
  Pencil,
  Plus,
} from 'lucide-react';
import { supabase } from '../../supabase';
import { useApp } from '../../AppContext';
import { showAlert } from '../../lib/notify';
import {
  PontoJornada,
  PontoRegistro,
  StatusDia,
  analisarDia,
  fmtHM,
  hhmm,
  hojeStr,
  inicioDaSemana,
  jornadaDoDia,
  somarDias,
} from '../../lib/pontoCalc';
import { PontoHeader } from './PontoHeader';
import { PontoSidebar, PontoNavTab } from './PontoSidebar';
import { PontoDashboard, DashboardRegItem } from './PontoDashboard';
import {
  PontoFuncionarios,
  PontoConfigFuncionarios,
  FuncionarioItem,
  ColaboradorOption,
} from './PontoFuncionarios';
import { PontoPerfil } from './PontoPerfil';
import {
  NovoFuncModal,
  EditFuncModal,
  RegistroModal,
  JornadaEditorModal,
  DesativarConfirmModal,
} from './PontoModals';

const COMPANY_ID = 'rafa-arts';
const DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ColabRow {
  id: string;
  nome: string;
  cargo?: string | null;
  foto_url: string | null;
  telefone_whatsapp: string | null;
  created_at?: string;
}

interface BancoMov {
  funcionario_id: string;
  minutos: number;
  tipo: string;
  validade: string | null;
}

export function PontoApp() {
  const { user } = useApp();
  const [currentTab, setCurrentTab] = useState<PontoNavTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Estados dos dados Supabase
  const [funcs, setFuncs] = useState<FuncionarioItem[]>([]);
  const [colabs, setColabs] = useState<ColaboradorOption[]>([]);
  const [usuariosLoginIds, setUsuariosLoginIds] = useState<Set<string>>(new Set());
  const [jornadas, setJornadas] = useState<(PontoJornada & { funcionario_id: string })[]>([]);
  const [registros, setRegistros] = useState<PontoRegistro[]>([]);
  const [banco, setBanco] = useState<BancoMov[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Navegação de perfil de funcionário
  const [selId, setSelId] = useState<string | null>(null);

  // Modais
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [editFuncModal, setEditFuncModal] = useState<FuncionarioItem | null>(null);
  const [editRegModal, setEditRegModal] = useState<{
    funcionario_id: string;
    data: string;
    reg: PontoRegistro | null;
  } | null>(null);
  const [jornadaModalFunc, setJornadaModalFunc] = useState<FuncionarioItem | null>(null);
  const [desativarFuncModal, setDesativarFuncModal] = useState<FuncionarioItem | null>(null);

  // Filtros gerais para a aba Registros
  const [filtroDataRegistros, setFiltroDataRegistros] = useState(hojeStr());
  const [buscaRegistros, setBuscaRegistros] = useState('');

  const hoje = hojeStr();
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  // Carregar dados de Ponto, Colaboradores, Jornadas, Registros e Banco de Horas
  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const desde = somarDias(hojeStr(), -62);

      // Carregar todas as tabelas em paralelo
      const [fResp, cResp, jResp, rResp, bResp] = await Promise.all([
        supabase
          .from('ponto_funcionarios')
          .select('*, colaboradores(id, nome, cargo, foto_url, telefone_whatsapp, created_at)')
          .eq('company_id', COMPANY_ID),
        supabase
          .from('colaboradores')
          .select('id, nome, cargo, foto_url, telefone_whatsapp, created_at')
          .eq('ativo', true)
          .order('nome'),
        supabase.from('ponto_jornadas').select('*'),
        supabase.from('ponto_registros').select('*').gte('data', desde),
        supabase.from('ponto_banco_horas').select('funcionario_id, minutos, tipo, validade'),
      ]);

      const falha = [fResp, cResp, jResp, rResp, bResp].find((x) => x.error);
      if (falha?.error) throw new Error(falha.error.message);

      // Carregar contas de login de usuarios com tolerancia a falhas
      const loginColabIds = new Set<string>();
      try {
        const { data: uData } = await supabase
          .from('usuarios')
          .select('id, email, name, colaborador_id');
        if (uData) {
          uData.forEach((u) => {
            if (u.colaborador_id) loginColabIds.add(u.colaborador_id);
          });
        }
      } catch (err) {
        console.warn('Não foi possível verificar contas de login em usuarios:', err);
      }
      setUsuariosLoginIds(loginColabIds);

      // Mapear funcionários com status de login
      const rawFuncs = (fResp.data || []) as any[];
      const mappedFuncs: FuncionarioItem[] = rawFuncs.map((rf) => ({
        ...rf,
        temLogin: rf.colaborador_id ? loginColabIds.has(rf.colaborador_id) : false,
      }));

      // Ordenar por número do relógio
      mappedFuncs.sort((a, b2) => Number(a.numero_relogio) - Number(b2.numero_relogio));

      setFuncs(mappedFuncs);
      setColabs((cResp.data || []) as ColaboradorOption[]);
      setJornadas((jResp.data || []) as any);
      setRegistros((rResp.data || []) as PontoRegistro[]);
      setBanco((bResp.data || []) as BancoMov[]);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar o ponto eletrônico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Mapa rápido de registros por funcionário e data
  const regMap = useMemo(() => {
    const m = new Map<string, PontoRegistro>();
    registros.forEach((r) => m.set(`${r.funcionario_id}|${r.data}`, r));
    return m;
  }, [registros]);

  const jornadasDe = useCallback(
    (fid: string) => jornadas.filter((j) => j.funcionario_id === fid),
    [jornadas]
  );

  const analise = useCallback(
    (f: FuncionarioItem, data: string) =>
      analisarDia(
        regMap.get(`${f.id}|${data}`),
        jornadaDoDia(jornadasDe(f.id), data),
        data,
        hoje,
        f.tolerancia_minutos,
        agoraMin
      ),
    [regMap, jornadasDe, hoje, agoraMin]
  );

  const saldoBanco = useCallback(
    (fid: string) =>
      banco
        .filter((m) => m.funcionario_id === fid && (m.minutos < 0 || !m.validade || m.validade >= hoje))
        .reduce((s, m) => s + m.minutos, 0),
    [banco, hoje]
  );

  // Funcionários ativos (exibidos na tela operacional)
  const ativos = useMemo(
    () => funcs.filter((f) => f.ativo && f.colaborador_id !== null),
    [funcs]
  );

  // Contagem do Dashboard
  const hojeCont = useMemo(() => {
    const c = { presente: 0, atrasado: 0, ausente: 0, outros: 0 };
    ativos.forEach((f) => {
      const s = analise(f, hoje).status;
      if (s === 'presente') c.presente++;
      else if (s === 'atrasado') c.atrasado++;
      else if (s === 'ausente') c.ausente++;
      else c.outros++;
    });
    return c;
  }, [ativos, analise, hoje]);

  // Gráfico da semana
  const semana = useMemo(() => {
    const ini = inicioDaSemana(hoje);
    return Array.from({ length: 7 }, (_, i) => {
      const data = somarDias(ini, i);
      let min = 0;
      let extra = 0;
      ativos.forEach((f) => {
        const a = analise(f, data);
        min += a.trabalhados;
        extra += a.extra;
      });
      return {
        data,
        dia: DIA_CURTO[new Date(`${data}T12:00:00`).getDay()],
        dow: new Date(`${data}T12:00:00`).getDay(),
        min,
        horas: Math.round((min / 60) * 10) / 10,
        extra,
      };
    });
  }, [ativos, analise, hoje]);

  const extraSemana = semana.reduce((s, d) => s + d.extra, 0);

  // Últimos registros para a tabela do Dashboard
  const ultimosDashboard = useMemo(() => {
    const items: DashboardRegItem[] = [];
    ativos.forEach((f) => {
      const r = regMap.get(`${f.id}|${hoje}`) || null;
      const a = analise(f, hoje);
      const nome = f.colaboradores?.nome || f.nome_relogio || `Funcionário ${f.numero_relogio}`;
      const setor = f.colaboradores?.cargo || 'Geral';
      items.push({
        funcionarioId: f.id,
        nome,
        setor,
        fotoUrl: f.colaboradores?.foto_url || null,
        data: hoje,
        entrada: r?.entrada || null,
        saida: r?.saida || null,
        minutosTrabalhados: a.trabalhados,
        status: a.status,
      });
    });
    return items.slice(0, 8);
  }, [ativos, regMap, analise, hoje]);

  // Inconsistências / Ajustes pendentes
  const ajustesPendentes = useMemo(() => {
    const lista: {
      func: FuncionarioItem;
      data: string;
      registro: PontoRegistro | null;
      status: StatusDia;
    }[] = [];

    // Checar os últimos 14 dias para todos os funcionários ativos
    for (let i = 0; i <= 14; i++) {
      const d = somarDias(hoje, -i);
      ativos.forEach((f) => {
        const r = regMap.get(`${f.id}|${d}`) || null;
        const a = analise(f, d);
        if (a.status === 'incompleto' || a.status === 'atrasado') {
          lista.push({ func: f, data: d, registro: r, status: a.status });
        }
      });
    }
    return lista;
  }, [ativos, regMap, analise, hoje]);

  // ---------------- Ações de Banco de Dados ----------------
  const salvarRegistro = async (fid: string, data: string, h: Partial<PontoRegistro>) => {
    const n = (v?: string | null) => (v ? v : null);
    const { error } = await supabase.from('ponto_registros').upsert(
      {
        funcionario_id: fid,
        data,
        entrada: n(h.entrada),
        inicio_intervalo: n(h.inicio_intervalo),
        fim_intervalo: n(h.fim_intervalo),
        saida: n(h.saida),
        observacao: n(h.observacao),
        origem: 'manual',
        editado_manual: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'funcionario_id,data' }
    );
    if (error) {
      showAlert(`Erro ao salvar registro de ponto: ${error.message}`);
      return;
    }
    setEditRegModal(null);
    await carregar();
    showAlert('Registro de ponto salvo com sucesso.');
  };

  // Desativar funcionário (ativo = false) SEM perder registros ou histórico
  const desativarFuncionario = async (func: FuncionarioItem) => {
    const { error } = await supabase
      .from('ponto_funcionarios')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', func.id);

    if (error) {
      showAlert(`Erro ao desativar: ${error.message}`);
      return;
    }
    setDesativarFuncModal(null);
    if (selId === func.id) setSelId(null);
    await carregar();
    showAlert('Funcionário desativado. Histórico mantido e disponível em Configurações > Inativos.');
  };

  // Reativar funcionário (ativo = true)
  const reativarFuncionario = async (funcId: string) => {
    const { error } = await supabase
      .from('ponto_funcionarios')
      .update({ ativo: true, updated_at: new Date().toISOString() })
      .eq('id', funcId);

    if (error) {
      showAlert(`Erro ao reativar: ${error.message}`);
      return;
    }
    await carregar();
    showAlert('Funcionário reativado com sucesso.');
  };

  // Vincular funcionário do relógio a um colaborador existente
  const vincularColaborador = async (funcId: string, colaboradorId: string) => {
    const { error } = await supabase
      .from('ponto_funcionarios')
      .update({
        colaborador_id: colaboradorId,
        ativo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', funcId);

    if (error) {
      showAlert(`Erro ao vincular colaborador: ${error.message}`);
      return;
    }
    await carregar();
    showAlert('Funcionário vinculado com sucesso e ativado no ponto.');
  };

  // Excluir funcionário: protegido com verificação de integridade histórica
  const excluirFuncionario = async (func: FuncionarioItem) => {
    // Verificar se o funcionário possui registros históricos de ponto
    const possuiRegistros = registros.some((r) => r.funcionario_id === func.id);
    if (possuiRegistros) {
      showAlert(
        'Este funcionário possui registros de ponto arquivados no sistema. Para garantir a segurança jurídica e trabalhista da empresa, ele não pode ser excluído fisicamente. Mantenha-o como Desativado.'
      );
      return;
    }

    const { error } = await supabase.from('ponto_funcionarios').delete().eq('id', func.id);
    if (error) {
      showAlert(`Erro ao excluir cadastro: ${error.message}`);
      return;
    }
    await carregar();
    showAlert('Cadastro de funcionário sem histórico removido com sucesso.');
  };

  // Atualizar foto do WhatsApp
  const buscarFoto = async (colab: any, telefone: string, silencioso = false) => {
    const digits = telefone.replace(/\D/g, '');
    if (!digits) {
      if (!silencioso) showAlert('Cadastre o WhatsApp do funcionário primeiro.');
      return;
    }
    try {
      const r = await fetch('/api/whatsapp-foto-perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ phone: digits }),
      });
      const d = await r.json();
      if (d?.photoUrl) {
        if (d.photoUrl !== colab.foto_url) {
          await supabase.from('colaboradores').update({ foto_url: d.photoUrl }).eq('id', colab.id);
          await carregar();
          if (!silencioso) showAlert('Foto do WhatsApp atualizada.');
        } else if (!silencioso) {
          showAlert('A foto já está atualizada.');
        }
      } else if (!silencioso) {
        showAlert('Não foi possível obter foto pública do WhatsApp.');
      }
    } catch {
      if (!silencioso) showAlert('Erro ao conectar com serviço de foto.');
    }
  };

  const funcionarioSelecionado = funcs.find((f) => f.id === selId) || null;

  // Render de carregamento
  if (loading && funcs.length === 0 && !erro) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center text-slate-400 text-sm">
        <RefreshCw size={24} className="animate-spin text-emerald-600 mb-3" />
        <p className="font-semibold text-slate-700">Carregando Ponto Eletrônico...</p>
        <p className="text-xs text-slate-400 mt-1">Conectando aos registros operacionais</p>
      </div>
    );
  }

  // Render de erro
  if (erro) {
    return (
      <div className="p-6 max-w-xl mx-auto my-8">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-sm space-y-3">
          <p className="flex items-center gap-2 text-rose-600 font-bold text-sm">
            <AlertTriangle size={18} /> Falha ao carregar o ponto
          </p>
          <p className="text-xs text-slate-600">{erro}</p>
          <button
            onClick={carregar}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[700px] bg-[#F4F6F8] text-slate-800 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
      {/* Sidebar do Ponto */}
      <PontoSidebar
        currentTab={currentTab}
        onSelectTab={(t) => {
          setCurrentTab(t);
          setSelId(null);
        }}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        userName={user?.displayName || 'Rafael Matos'}
        userRole={user?.role === 'admin' ? 'Administrador' : 'Gestor de Ponto'}
        userPhoto={user?.photoURL}
        pendingAdjustmentsCount={ajustesPendentes.length}
      />

      {/* Área Central / Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header do Ponto */}
        <PontoHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          pendingCount={ajustesPendentes.length}
          userName={user?.displayName || 'Rafael Matos'}
          userPhoto={user?.photoURL}
        />

        {/* Corpo com Scroll */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          {/* Se um funcionário estiver selecionado, exibe a tela de Perfil (Imagem 2) */}
          {selId && funcionarioSelecionado ? (
            <PontoPerfil
              func={funcionarioSelecionado}
              jornadas={jornadasDe(funcionarioSelecionado.id)}
              registros={registros}
              saldoBancoMinutos={saldoBanco(funcionarioSelecionado.id)}
              onVoltar={() => setSelId(null)}
              onEditarDados={() => setEditFuncModal(funcionarioSelecionado)}
              onEditarRegistro={(data, reg) =>
                setEditRegModal({ funcionario_id: funcionarioSelecionado.id, data, reg })
              }
              onEditarJornada={() => setJornadaModalFunc(funcionarioSelecionado)}
              onAtualizarFoto={() => {
                if (funcionarioSelecionado.colaboradores?.telefone_whatsapp) {
                  buscarFoto(
                    funcionarioSelecionado.colaboradores,
                    funcionarioSelecionado.colaboradores.telefone_whatsapp
                  );
                } else {
                  showAlert('Cadastre o WhatsApp do funcionário primeiro.');
                }
              }}
            />
          ) : (
            <>
              {/* TAB: DASHBOARD (Imagem 1) */}
              {currentTab === 'dashboard' && (
                <PontoDashboard
                  presentes={hojeCont.presente}
                  atrasados={hojeCont.atrasado}
                  ausentes={hojeCont.ausente}
                  horasExtrasMinutos={extraSemana}
                  semanaGrafico={semana}
                  totalFuncionarios={ativos.length}
                  ultimosRegistros={ultimosDashboard}
                  onVerTodosRegistros={() => setCurrentTab('registros')}
                  onAbrirFuncionario={(id) => {
                    setSelId(id);
                  }}
                />
              )}

              {/* TAB: FUNCIONÁRIOS (Somente Ativos!) */}
              {currentTab === 'funcionarios' && (
                <PontoFuncionarios
                  funcionariosAtivos={ativos}
                  onAbrirPerfil={(id) => setSelId(id)}
                  onEditarFuncionario={(f) => setEditFuncModal(f)}
                  onDesativarFuncionario={(f) => setDesativarFuncModal(f)}
                  onNovoFuncionario={() => setNovoModalOpen(true)}
                />
              )}

              {/* TAB: REGISTROS DE PONTO (Visão geral de todos os registros) */}
              {currentTab === 'registros' && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Registros de Ponto
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Histórico e batidas de ponto de todos os funcionários
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={filtroDataRegistros}
                        onChange={(e) => setFiltroDataRegistros(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
                      />
                      <div className="relative min-w-[180px]">
                        <Search
                          size={13}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={buscaRegistros}
                          onChange={(e) => setBuscaRegistros(e.target.value)}
                          placeholder="Buscar funcionário..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 font-semibold border-b border-slate-100 text-left">
                          <th className="pb-3 pr-4">Funcionário</th>
                          <th className="pb-3 pr-4">Matrícula</th>
                          <th className="pb-3 pr-4">Entrada</th>
                          <th className="pb-3 pr-4">Início Int.</th>
                          <th className="pb-3 pr-4">Fim Int.</th>
                          <th className="pb-3 pr-4">Saída</th>
                          <th className="pb-3 pr-4">Horas</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ativos
                          .filter((f) => {
                            const nome = (
                              f.colaboradores?.nome ||
                              f.nome_relogio ||
                              ''
                            ).toLowerCase();
                            return nome.includes(buscaRegistros.toLowerCase());
                          })
                          .map((f) => {
                            const r = regMap.get(`${f.id}|${filtroDataRegistros}`) || null;
                            const a = analise(f, filtroDataRegistros);
                            const nome =
                              f.colaboradores?.nome ||
                              f.nome_relogio ||
                              `Funcionário ${f.numero_relogio}`;

                            return (
                              <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 pr-4 font-bold text-slate-800">
                                  <button
                                    onClick={() => setSelId(f.id)}
                                    className="hover:text-emerald-700 text-left"
                                  >
                                    {nome}
                                  </button>
                                </td>
                                <td className="py-3 pr-4 text-slate-500 font-mono">
                                  {String(f.numero_relogio).padStart(3, '0')}
                                </td>
                                <td className="py-3 pr-4 font-mono text-slate-700">
                                  {hhmm(r?.entrada)}
                                </td>
                                <td className="py-3 pr-4 font-mono text-slate-700">
                                  {hhmm(r?.inicio_intervalo)}
                                </td>
                                <td className="py-3 pr-4 font-mono text-slate-700">
                                  {hhmm(r?.fim_intervalo)}
                                </td>
                                <td className="py-3 pr-4 font-mono text-slate-700">
                                  {hhmm(r?.saida)}
                                </td>
                                <td className="py-3 pr-4 font-bold text-slate-800">
                                  {fmtHM(a.trabalhados)}
                                </td>
                                <td className="py-3 pr-4">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      a.status === 'presente'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : a.status === 'atrasado'
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {a.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() =>
                                      setEditRegModal({
                                        funcionario_id: f.id,
                                        data: filtroDataRegistros,
                                        reg: r,
                                      })
                                    }
                                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                                    title="Editar registro"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: AJUSTES PENDENTES */}
              {currentTab === 'ajustes' && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Ajustes Pendentes
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Ocorrências de batidas faltantes, atrasos relevantes e divergências
                    </p>
                  </div>

                  {ajustesPendentes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Nenhuma pendência ou inconsistência encontrada nos últimos 14 dias!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ajustesPendentes.map((item, idx) => {
                        const nome =
                          item.func.colaboradores?.nome ||
                          item.func.nome_relogio ||
                          `Funcionário ${item.func.numero_relogio}`;
                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{nome}</span>
                                <span className="text-slate-400">•</span>
                                <span className="font-semibold text-slate-700">
                                  {item.data.split('-').reverse().join('/')}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Batida registrada:{' '}
                                <span className="font-mono">
                                  {hhmm(item.registro?.entrada)} / {hhmm(item.registro?.saida)}
                                </span>{' '}
                                • Motivo:{' '}
                                <span className="font-semibold text-amber-700">
                                  {item.status === 'incompleto'
                                    ? 'Batida de saída ou intervalo faltando'
                                    : 'Atraso fora da tolerância'}
                                </span>
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                setEditRegModal({
                                  funcionario_id: item.func.id,
                                  data: item.data,
                                  reg: item.registro,
                                })
                              }
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors shrink-0"
                            >
                              Ajustar Agora
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: RELATÓRIOS */}
              {currentTab === 'relatorios' && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Relatórios do Ponto
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Consolidado mensal de horas, extras e frequência
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 font-semibold border-b border-slate-100 text-left">
                          <th className="pb-3 pr-4">Funcionário</th>
                          <th className="pb-3 pr-4">Setor</th>
                          <th className="pb-3 pr-4">Horas Trabalhadas (Mês)</th>
                          <th className="pb-3 pr-4">Saldo Banco de Horas</th>
                          <th className="pb-3 text-right">Espelho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ativos.map((f) => {
                          const saldo = saldoBanco(f.id);
                          const nome =
                            f.colaboradores?.nome ||
                            f.nome_relogio ||
                            `Funcionário ${f.numero_relogio}`;
                          return (
                            <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 pr-4 font-bold text-slate-800">{nome}</td>
                              <td className="py-3 pr-4 text-slate-500">
                                {f.colaboradores?.cargo || 'Geral'}
                              </td>
                              <td className="py-3 pr-4 font-bold text-slate-800">
                                {fmtHM(analise(f, hoje).trabalhados * 20)} (estimado)
                              </td>
                              <td
                                className={`py-3 pr-4 font-bold ${
                                  saldo >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {saldo >= 0 ? '+ ' : '- '}
                                {fmtHM(Math.abs(saldo))}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => setSelId(f.id)}
                                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                                >
                                  Ver Espelho
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: CONFIGURAÇÕES (Funcionários Ativos, Inativos, Não Vinculados) */}
              {currentTab === 'configuracoes' && (
                <PontoConfigFuncionarios
                  todosFuncionarios={funcs}
                  colaboradoresDisponiveis={colabs}
                  onAbrirPerfil={(id) => setSelId(id)}
                  onEditarFuncionario={(f) => setEditFuncModal(f)}
                  onDesativarFuncionario={(f) => setDesativarFuncModal(f)}
                  onReativarFuncionario={reativarFuncionario}
                  onExcluirFuncionario={excluirFuncionario}
                  onVincularColaborador={vincularColaborador}
                  onNovoFuncionario={() => setNovoModalOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modais do Sistema */}
      {novoModalOpen && (
        <NovoFuncModal
          colabs={colabs}
          onClose={() => setNovoModalOpen(false)}
          onSaved={async () => {
            setNovoModalOpen(false);
            await carregar();
          }}
        />
      )}

      {editFuncModal && (
        <EditFuncModal
          func={editFuncModal}
          colabs={colabs}
          onClose={() => setEditFuncModal(null)}
          onSaved={async () => {
            setEditFuncModal(null);
            await carregar();
          }}
          buscarFoto={buscarFoto}
        />
      )}

      {editRegModal && (
        <RegistroModal
          ctx={editRegModal}
          onClose={() => setEditRegModal(null)}
          onSave={salvarRegistro}
        />
      )}

      {jornadaModalFunc && (
        <JornadaEditorModal
          func={jornadaModalFunc}
          jornadas={jornadasDe(jornadaModalFunc.id)}
          onClose={() => setJornadaModalFunc(null)}
          onSaved={async () => {
            setJornadaModalFunc(null);
            await carregar();
          }}
        />
      )}

      {desativarFuncModal && (
        <DesativarConfirmModal
          func={desativarFuncModal}
          onClose={() => setDesativarFuncModal(null)}
          onConfirm={() => desativarFuncionario(desativarFuncModal)}
        />
      )}
    </div>
  );
}
