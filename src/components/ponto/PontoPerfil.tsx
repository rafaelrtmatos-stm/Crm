import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Scale,
  Percent,
  LogIn,
  LogOut,
  Coffee,
  Pencil,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Printer,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AvatarPhoto } from '../SharedUI';
import {
  PontoJornada,
  PontoRegistro,
  StatusDia,
  analisarDia,
  fmtHM,
  hhmm,
  hojeStr,
  jornadaDoDia,
} from '../../lib/pontoCalc';
import { FuncionarioItem } from './PontoFuncionarios';

interface PontoPerfilProps {
  func: FuncionarioItem;
  jornadas: PontoJornada[];
  registros: PontoRegistro[];
  saldoBancoMinutos: number;
  onVoltar: () => void;
  onEditarDados: () => void;
  onEditarRegistro: (data: string, reg: PontoRegistro | null) => void;
  onEditarJornada: () => void;
  onAtualizarFoto: () => void;
}

export function PontoPerfil({
  func,
  jornadas,
  registros,
  saldoBancoMinutos,
  onVoltar,
  onEditarDados,
  onEditarRegistro,
  onEditarJornada,
  onAtualizarFoto,
}: PontoPerfilProps) {
  const [abaAtiva, setAbaAtiva] = useState<
    'geral' | 'registros' | 'espelho' | 'ajustes' | 'banco' | 'jornada'
  >('geral');
  const [mesSelecionado, setMesSelecionado] = useState(() => hojeStr().slice(0, 7));

  const hoje = hojeStr();
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  const regMap = new Map<string, PontoRegistro>();
  registros.forEach((r) => regMap.set(`${r.funcionario_id}|${r.data}`, r));

  const analiseHoje = analisarDia(
    regMap.get(`${func.id}|${hoje}`),
    jornadaDoDia(jornadas, hoje),
    hoje,
    hoje,
    func.tolerancia_minutos,
    agoraMin
  );

  const hojeReg = regMap.get(`${func.id}|${hoje}`) || null;
  const jornadaHoje = jornadaDoDia(jornadas, hoje);

  // Estatísticas do mês selecionado
  const ano = parseInt(mesSelecionado.slice(0, 4), 10);
  const mes = parseInt(mesSelecionado.slice(5, 7), 10);
  const diasNoMes = new Date(ano, mes, 0).getDate();

  const diasDoMes: string[] = [];
  for (let i = 1; i <= diasNoMes; i++) {
    const dStr = `${mesSelecionado}-${String(i).padStart(2, '0')}`;
    diasDoMes.push(dStr);
  }

  let minMes = 0;
  let diasTrabalhados = 0;
  let atrasos = 0;
  let faltas = 0;
  let diasUteis = 0;

  diasDoMes.forEach((d) => {
    if (d <= hoje) {
      const a = analisarDia(
        regMap.get(`${func.id}|${d}`),
        jornadaDoDia(jornadas, d),
        d,
        hoje,
        func.tolerancia_minutos,
        agoraMin
      );
      minMes += a.trabalhados;
      if (a.status === 'presente' || a.status === 'atrasado') diasTrabalhados++;
      if (a.status === 'atrasado') atrasos++;
      if (a.status === 'ausente') faltas++;
      if (['presente', 'atrasado', 'ausente', 'incompleto'].includes(a.status)) diasUteis++;
    }
  });

  const frequenciaPct = diasUteis > 0 ? Math.round((diasTrabalhados / diasUteis) * 100) : 100;

  // Informações do colaborador
  const colab = func.colaboradores;
  const nome = colab?.nome || func.nome_relogio || `Funcionário ${func.numero_relogio}`;
  const setor = colab?.cargo || 'Impressão e Instalação';
  const matricula = String(func.numero_relogio).padStart(3, '0');
  const idPonto = String(func.numero_relogio).padStart(10, '0');
  const admissao = colab?.created_at
    ? format(new Date(colab.created_at), 'dd/MM/yyyy')
    : '10/01/2024';

  const statusPill = (status: StatusDia) => {
    switch (status) {
      case 'presente':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Presente
          </span>
        );
      case 'atrasado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Atrasado
          </span>
        );
      case 'ausente':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Ausente
          </span>
        );
      case 'incompleto':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Incompleto
          </span>
        );
      case 'folga':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Folga
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            Aguardando
          </span>
        );
    }
  };

  // Últimos registros para a tabela do perfil
  const ultimosDias = [...diasDoMes].filter((d) => d <= hoje).slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Breadcrumb e Botão Voltar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <button onClick={onVoltar} className="hover:text-emerald-700 transition-colors">
            Funcionários
          </button>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-900 font-bold">{nome}</span>
        </div>

        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <ChevronLeft size={14} /> Voltar para a lista
        </button>
      </div>

      {/* Topo do Perfil: Card do Funcionário + 4 Cards de Indicadores */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Card Grande do Funcionário */}
        <div className="xl:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="relative group shrink-0">
              <AvatarPhoto
                photoUrl={colab?.foto_url}
                name={nome}
                className="w-20 h-20 border-2 border-white ring-2 ring-slate-100 shadow-xs"
                textClassName="text-2xl font-black text-slate-700"
              />
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20"
                title="Ativo"
              />
              <button
                onClick={onAtualizarFoto}
                title="Atualizar foto do WhatsApp"
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
              >
                <Camera size={18} />
              </button>
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900 truncate tracking-tight">{nome}</h2>
              <p className="text-xs font-semibold text-emerald-700">{setor}</p>
              <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                <p>
                  Matrícula: <b className="text-slate-700">{matricula}</b>
                </p>
                <p>
                  Admissão: <b className="text-slate-700">{admissao}</b>
                </p>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Ativo
                </span>
                {func.temLogin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    <ShieldCheck size={11} /> Com conta
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <ShieldAlert size={11} className="text-slate-400" /> Sem conta
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              ID Ponto: <b className="font-mono text-slate-700">{idPonto}</b>
            </span>
            <button
              onClick={onEditarDados}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Pencil size={12} /> Editar dados
            </button>
          </div>
        </div>

        {/* 4 Cards de Indicadores (KPIs do Perfil) */}
        <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Horas hoje */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Clock size={20} />
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">
              {fmtHM(analiseHoje.trabalhados)}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Horas hoje</p>
          </div>

          {/* Horas no mês */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-center">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Calendar size={20} />
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">{fmtHM(minMes)}</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Horas no mês</p>
          </div>

          {/* Banco de horas */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-center">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Scale size={20} />
            </div>
            <p
              className={`text-2xl font-black leading-none ${
                saldoBancoMinutos >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {saldoBancoMinutos >= 0 ? '+ ' : '- '}
              {fmtHM(Math.abs(saldoBancoMinutos))}
            </p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Banco de horas</p>
          </div>

          {/* Frequência (mês) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Percent size={20} />
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">{frequenciaPct}%</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Frequência (mês)</p>
          </div>
        </div>
      </div>

      {/* Abas de Navegação do Perfil */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'geral', label: 'Visão Geral' },
          { id: 'registros', label: 'Registros de Ponto' },
          { id: 'espelho', label: 'Espelho de Ponto' },
          { id: 'ajustes', label: 'Ajustes' },
          { id: 'banco', label: 'Banco de Horas' },
          { id: 'jornada', label: 'Jornada' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setAbaAtiva(item.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              abaAtiva === item.id
                ? 'bg-[#0B3D2B] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DA ABA: VISÃO GERAL */}
      {abaAtiva === 'geral' && (
        <div className="space-y-6">
          {/* Linha Superior: Registro de hoje + Jornada de Trabalho */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Registro de Hoje */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Registro de hoje</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Calendar size={12} />
                    {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => onEditarRegistro(hoje, hojeReg)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
                >
                  <Pencil size={12} /> Lançar / Editar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Linha do tempo dos 4 horários */}
                <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Entrada */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20" />
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                      <LogIn size={15} className="text-emerald-600" /> Entrada
                    </span>
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      {hhmm(hojeReg?.entrada)}
                    </span>
                  </div>

                  {/* Início Intervalo */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white ring-1 ring-amber-400/20" />
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                      <Coffee size={15} className="text-amber-500" /> Início do Intervalo
                    </span>
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      {hhmm(hojeReg?.inicio_intervalo)}
                    </span>
                  </div>

                  {/* Fim Intervalo */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white ring-1 ring-amber-400/20" />
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                      <Coffee size={15} className="text-amber-500" /> Fim do Intervalo
                    </span>
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      {hhmm(hojeReg?.fim_intervalo)}
                    </span>
                  </div>

                  {/* Saída */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white ring-1 ring-rose-500/20" />
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                      <LogOut size={15} className="text-rose-600" /> Saída
                    </span>
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      {hhmm(hojeReg?.saida)}
                    </span>
                  </div>
                </div>

                {/* 2 Mini Cards Laterais */}
                <div className="flex flex-col justify-between gap-3">
                  <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-800">
                        Horas trabalhadas hoje
                      </p>
                      <p className="text-lg font-black text-emerald-950">
                        {fmtHM(analiseHoje.trabalhados)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <Scale size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-600">Banco de horas</p>
                      <p
                        className={`text-lg font-black ${
                          saldoBancoMinutos >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {saldoBancoMinutos >= 0 ? '+ ' : '- '}
                        {fmtHM(Math.abs(saldoBancoMinutos))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Jornada de Trabalho */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900">Jornada de Trabalho</h3>
                  <button
                    onClick={onEditarJornada}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" /> Horário de entrada
                    </span>
                    <b className="text-slate-800 font-mono">
                      {hhmm(jornadaHoje?.entrada || '08:00')}
                    </b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" /> Horário de saída
                    </span>
                    <b className="text-slate-800 font-mono">
                      {hhmm(jornadaHoje?.saida || '17:00')}
                    </b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-2">
                      <Coffee size={14} className="text-slate-400" /> Intervalo
                    </span>
                    <b className="text-slate-800 font-mono">
                      {hhmm(jornadaHoje?.inicio_intervalo || '12:00')} -{' '}
                      {hhmm(jornadaHoje?.fim_intervalo || '13:00')}
                    </b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" /> Dias de trabalho
                    </span>
                    <b className="text-slate-800">Segunda a Sábado</b>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500 font-medium flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" /> Carga horária diária
                    </span>
                    <b className="text-slate-800">8 horas</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linha Inferior: Últimos registros de ponto + Resumo do mês */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Tabela: Últimos registros de ponto */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900">Últimos registros de ponto</h3>
                <button
                  onClick={() => setAbaAtiva('registros')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Ver todos <ArrowRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100 text-left">
                      <th className="pb-2.5 pr-3">Data</th>
                      <th className="pb-2.5 pr-3">Entrada</th>
                      <th className="pb-2.5 pr-3">Início Int.</th>
                      <th className="pb-2.5 pr-3">Fim Int.</th>
                      <th className="pb-2.5 pr-3">Saída</th>
                      <th className="pb-2.5 pr-3">Horas</th>
                      <th className="pb-2.5 pr-3">Status</th>
                      <th className="pb-2.5 text-right">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ultimosDias.map((d) => {
                      const r = regMap.get(`${func.id}|${d}`) || null;
                      const a = analisarDia(
                        r,
                        jornadaDoDia(jornadas, d),
                        d,
                        hoje,
                        func.tolerancia_minutos,
                        agoraMin
                      );
                      const dataFormatada = format(new Date(`${d}T12:00:00`), 'dd/MM/yyyy');
                      const diaSemana = format(new Date(`${d}T12:00:00`), 'EEE', {
                        locale: ptBR,
                      });

                      return (
                        <tr key={d} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                            {dataFormatada} ({diaSemana})
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-slate-700">
                            {hhmm(r?.entrada)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-slate-700">
                            {hhmm(r?.inicio_intervalo)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-slate-700">
                            {hhmm(r?.fim_intervalo)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-slate-700">{hhmm(r?.saida)}</td>
                          <td className="py-2.5 pr-3 font-semibold text-slate-900">
                            {fmtHM(a.trabalhados)}
                          </td>
                          <td className="py-2.5 pr-3">{statusPill(a.status)}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => onEditarRegistro(d, r)}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
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

            {/* Resumo do Mês */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900">Resumo do mês</h3>
                  <input
                    type="month"
                    value={mesSelecionado}
                    onChange={(e) => setMesSelecionado(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-semibold"
                  />
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500" /> Dias trabalhados
                    </span>
                    <b className="text-slate-900 font-bold">{diasTrabalhados}</b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-500" /> Atrasos
                    </span>
                    <b className="text-slate-900 font-bold">{atrasos}</b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <XCircle size={15} className="text-rose-500" /> Faltas
                    </span>
                    <b className="text-slate-900 font-bold">{faltas}</b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <Clock size={15} className="text-blue-500" /> Horas trabalhadas
                    </span>
                    <b className="text-slate-900 font-bold">{fmtHM(minMes)}</b>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <Scale size={15} className="text-purple-500" /> Banco de horas
                    </span>
                    <b
                      className={`font-bold ${
                        saldoBancoMinutos >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {saldoBancoMinutos >= 0 ? '+ ' : '- '}
                      {fmtHM(Math.abs(saldoBancoMinutos))}
                    </b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: REGISTROS DE PONTO */}
      {abaAtiva === 'registros' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Todos os registros ({mesSelecionado})
            </h3>
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-semibold"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-100 text-left">
                  <th className="pb-3 pr-3">Data</th>
                  <th className="pb-3 pr-3">Entrada</th>
                  <th className="pb-3 pr-3">Início int.</th>
                  <th className="pb-3 pr-3">Fim int.</th>
                  <th className="pb-3 pr-3">Saída</th>
                  <th className="pb-3 pr-3">Horas</th>
                  <th className="pb-3 pr-3">Extra</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...diasDoMes].reverse().map((d) => {
                  const r = regMap.get(`${func.id}|${d}`) || null;
                  const a = analisarDia(
                    r,
                    jornadaDoDia(jornadas, d),
                    d,
                    hoje,
                    func.tolerancia_minutos,
                    agoraMin
                  );
                  const dataFormatada = format(new Date(`${d}T12:00:00`), 'dd/MM/yyyy');
                  const diaSemana = format(new Date(`${d}T12:00:00`), 'EEE', { locale: ptBR });

                  return (
                    <tr key={d} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                        {dataFormatada} ({diaSemana})
                        {r?.editado_manual && (
                          <span
                            title="Editado manualmente"
                            className="ml-1 text-emerald-600 font-bold"
                          >
                            ✎
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-700">{hhmm(r?.entrada)}</td>
                      <td className="py-2.5 pr-3 font-mono text-slate-700">
                        {hhmm(r?.inicio_intervalo)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-700">
                        {hhmm(r?.fim_intervalo)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-700">{hhmm(r?.saida)}</td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        {fmtHM(a.trabalhados)}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-emerald-600">
                        {a.extra ? fmtHM(a.extra) : '—'}
                      </td>
                      <td className="py-2.5 pr-3">{statusPill(a.status)}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onEditarRegistro(d, r)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
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

      {/* CONTEÚDO DA ABA: ESPELHO DE PONTO (OFICIAL) */}
      {abaAtiva === 'espelho' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Espelho de Ponto Individual de Trabalho
              </h3>
              <p className="text-xs text-slate-500">
                Empresa: <b>Rafa Arts Graphics</b> • Período: <b>{mesSelecionado}</b>
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
            >
              <Printer size={14} /> Imprimir / Exportar PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Funcionário</span>
              <span className="font-bold text-slate-800">{nome}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Cargo / Função</span>
              <span className="font-bold text-slate-800">{setor}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Matrícula</span>
              <span className="font-bold text-slate-800">{matricula}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">ID Ponto Relógio</span>
              <span className="font-bold font-mono text-slate-800">{idPonto}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                  <th className="p-2 border-r border-slate-200">Dia</th>
                  <th className="p-2 border-r border-slate-200">Entrada</th>
                  <th className="p-2 border-r border-slate-200">Início Intervalo</th>
                  <th className="p-2 border-r border-slate-200">Fim Intervalo</th>
                  <th className="p-2 border-r border-slate-200">Saída</th>
                  <th className="p-2 border-r border-slate-200">Total</th>
                  <th className="p-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {diasDoMes.map((d) => {
                  const r = regMap.get(`${func.id}|${d}`) || null;
                  const a = analisarDia(
                    r,
                    jornadaDoDia(jornadas, d),
                    d,
                    hoje,
                    func.tolerancia_minutos,
                    agoraMin
                  );
                  const diaSemana = format(new Date(`${d}T12:00:00`), 'EEEE', { locale: ptBR });
                  const diaNum = d.split('-')[2];

                  return (
                    <tr key={d}>
                      <td className="p-2 border-r border-slate-200 font-semibold">
                        {diaNum} - {diaSemana}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono">
                        {hhmm(r?.entrada)}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono">
                        {hhmm(r?.inicio_intervalo)}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono">
                        {hhmm(r?.fim_intervalo)}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono">{hhmm(r?.saida)}</td>
                      <td className="p-2 border-r border-slate-200 font-bold">
                        {fmtHM(a.trabalhados)}
                      </td>
                      <td className="p-2">{statusPill(a.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-48 mx-auto" />
              <p className="font-bold text-slate-800">Assinatura do Empregador</p>
              <p className="text-slate-400 text-[10px]">Rafa Arts Graphics</p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-48 mx-auto" />
              <p className="font-bold text-slate-800">Assinatura do Funcionário</p>
              <p className="text-slate-400 text-[10px]">{nome}</p>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: AJUSTES */}
      {abaAtiva === 'ajustes' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900">
            Ajustes e Inconsistências de Batidas
          </h3>
          <p className="text-xs text-slate-500">
            Dias em que houve batida faltando, ausência de saída ou atraso fora da tolerância.
          </p>

          <div className="space-y-2">
            {diasDoMes
              .filter((d) => d <= hoje)
              .map((d) => {
                const r = regMap.get(`${func.id}|${d}`) || null;
                const a = analisarDia(
                  r,
                  jornadaDoDia(jornadas, d),
                  d,
                  hoje,
                  func.tolerancia_minutos,
                  agoraMin
                );
                if (a.status !== 'incompleto' && a.status !== 'atrasado' && a.status !== 'ausente')
                  return null;

                return (
                  <div
                    key={d}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {format(new Date(`${d}T12:00:00`), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Batidas registradas:{' '}
                        <span className="font-mono">
                          {hhmm(r?.entrada)} / {hhmm(r?.saida)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusPill(a.status)}
                      <button
                        onClick={() => onEditarRegistro(d, r)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        Corrigir Ponto
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: BANCO DE HORAS */}
      {abaAtiva === 'banco' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Extrato do Banco de Horas</h3>
              <p className="text-xs text-slate-500">
                Créditos possuem validade de 6 meses conforme convenção.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-semibold block">Saldo Atual</span>
              <span
                className={`text-xl font-black ${
                  saldoBancoMinutos >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {saldoBancoMinutos >= 0 ? '+ ' : '- '}
                {fmtHM(Math.abs(saldoBancoMinutos))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: JORNADA */}
      {abaAtiva === 'jornada' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Jornada Semanal Cadastrada</h3>
              <p className="text-xs text-slate-500">
                Horários de trabalho programados para cada dia da semana
              </p>
            </div>
            <button
              onClick={onEditarJornada}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              <Pencil size={13} /> Editar Grade Semanal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
