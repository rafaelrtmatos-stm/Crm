import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Pencil,
  Clock,
  Calendar,
  Scale,
  Percent,
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Printer,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AvatarPhoto } from '../SharedUI';
import {
  analisarDia,
  fmtHM,
  jornadaDoDia,
  StatusDia,
  PontoRegistro,
  PontoJornada,
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
  const [mesSelecionado, setMesSelecionado] = useState(format(new Date(), 'yyyy-MM'));

  const colab = func.colaboradores;
  const nome = colab?.nome || func.nome_relogio || `Funcionário ${func.numero_relogio}`;
  const setor = colab?.cargo || 'Impressão e Instalação';
  const matricula = String(func.numero_relogio).padStart(3, '0');
  const idPonto = String(func.numero_relogio).padStart(10, '0');

  // Mapa rápido de registros por data
  const regMap = new Map<string, PontoRegistro>();
  registros.forEach((r) => {
    regMap.set(`${r.funcionario_id}|${r.data}`, r);
  });

  const hoje = format(new Date(), 'yyyy-MM-dd');
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const hojeReg = regMap.get(`${func.id}|${hoje}`) || null;
  const jornadaHoje = jornadaDoDia(jornadas, hoje);
  const analiseHoje = analisarDia(
    hojeReg,
    jornadaHoje,
    hoje,
    hoje,
    func.tolerancia_minutos,
    agoraMin
  );

  // Geração de todos os dias do mês selecionado
  const [anoStr, mesStr] = mesSelecionado.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const totalDiasNoMes = new Date(ano, mes, 0).getDate();
  const diasDoMes: string[] = [];
  for (let d = 1; d <= totalDiasNoMes; d++) {
    const diaFmt = String(d).padStart(2, '0');
    diasDoMes.push(`${mesSelecionado}-${diaFmt}`);
  }

  // Estatísticas do Mês
  let minMes = 0;
  let diasTrabalhados = 0;
  let atrasos = 0;
  let faltas = 0;

  diasDoMes.forEach((d) => {
    if (d <= hoje) {
      const r = regMap.get(`${func.id}|${d}`) || null;
      const a = analisarDia(r, jornadaDoDia(jornadas, d), d, hoje, func.tolerancia_minutos, agoraMin);
      minMes += a.trabalhados;
      if (a.trabalhados > 0) diasTrabalhados++;
      if (a.status === 'atrasado') atrasos++;
      if (a.status === 'ausente') faltas++;
    }
  });

  // Frequência percentual (base 22 dias úteis)
  const frequenciaPct = Math.min(100, Math.round((diasTrabalhados / 22) * 100));

  const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : '—');
  const admissao = colab && (colab as any).created_at
    ? format(new Date((colab as any).created_at), 'dd/MM/yyyy')
    : '10/01/2024';

  const statusPill = (status: StatusDia) => {
    switch (status) {
      case 'presente':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Presente
          </span>
        );
      case 'atrasado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Atrasado
          </span>
        );
      case 'ausente':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Ausente
          </span>
        );
      case 'incompleto':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            Incompleto
          </span>
        );
      case 'folga':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white/60 border border-white/10">
            Folga
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            Aguardando
          </span>
        );
    }
  };

  // Últimos registros para a tabela do perfil
  const ultimosDias = [...diasDoMes].filter((d) => d <= hoje).slice(-5).reverse();

  return (
    <div className="space-y-6 text-white">
      {/* Breadcrumb e Botão Voltar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
          <button onClick={onVoltar} className="hover:text-emerald-400 transition-colors cursor-pointer">
            Funcionários
          </button>
          <ChevronRight size={14} className="text-white/40" />
          <span className="text-white font-bold">{nome}</span>
        </div>

        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white text-xs font-bold hover:bg-white/10 shadow-xs transition-colors cursor-pointer"
        >
          <ChevronLeft size={14} /> Voltar para a lista
        </button>
      </div>

      {/* Topo do Perfil: Card do Funcionário + 4 Cards de Indicadores */}
      {/* Topo do Perfil: Card do Funcionário + 4 Cards de Indicadores Compactos */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
        {/* Card do Funcionário - Compacto */}
        <div className="xl:col-span-4 bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-4.5 border border-white/10 shadow-xl flex flex-col justify-between min-w-0">
          <div className="flex items-start gap-3">
            <div className="relative group shrink-0">
              <AvatarPhoto
                photoUrl={colab?.foto_url}
                name={nome}
                className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white/10 ring-2 ring-white/5 shadow-md bg-slate-800"
                textClassName="text-lg sm:text-xl font-black text-white"
              />
              <span
                className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 ring-1 ring-emerald-500/30"
                title="Ativo"
              />
              <button
                onClick={onAtualizarFoto}
                title="Atualizar foto do WhatsApp"
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
              >
                <Camera size={15} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-white truncate tracking-tight" title={nome}>{nome}</h2>
              <p className="text-[11px] font-semibold text-emerald-400 truncate">{setor}</p>
              <div className="mt-1 text-[10.5px] text-white/50 space-y-0.5">
                <p className="truncate">
                  Matrícula: <b className="text-white/80">{matricula}</b>
                </p>
                <p className="truncate">
                  Admissão: <b className="text-white/80">{admissao}</b>
                </p>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ativo
                </span>
                {func.temLogin ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    <ShieldCheck size={10} /> Com conta
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/5 text-white/50 border border-white/10">
                    <ShieldAlert size={10} className="text-white/40" /> Sem conta
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-white/40 font-medium truncate">
              ID Ponto: <b className="font-mono text-white/80">{idPonto}</b>
            </span>
            <button
              onClick={onEditarDados}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer shrink-0 ml-2"
            >
              <Pencil size={11} /> Editar dados
            </button>
          </div>
        </div>

        {/* 4 Cards de Indicadores (KPIs do Perfil Compactos) */}
        <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Horas hoje */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border border-white/10 shadow-xl flex flex-col justify-center min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/30 shrink-0">
              <Clock size={16} />
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-black text-white leading-tight truncate whitespace-nowrap">
              {fmtHM(analiseHoje.trabalhados)}
            </p>
            <p className="text-[10.5px] font-semibold text-white/40 mt-0.5 truncate whitespace-nowrap">Horas hoje</p>
          </div>

          {/* Horas no mês */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border border-white/10 shadow-xl flex flex-col justify-center min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2 border border-sky-500/30 shrink-0">
              <Calendar size={16} />
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-black text-white leading-tight truncate whitespace-nowrap">{fmtHM(minMes)}</p>
            <p className="text-[10.5px] font-semibold text-white/40 mt-0.5 truncate whitespace-nowrap">Horas no mês</p>
          </div>

          {/* Banco de horas */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border border-white/10 shadow-xl flex flex-col justify-center min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 border border-purple-500/30 shrink-0">
              <Scale size={16} />
            </div>
            <p
              className={`text-base sm:text-lg lg:text-xl font-black leading-tight truncate whitespace-nowrap ${
                saldoBancoMinutos >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {saldoBancoMinutos >= 0 ? '+ ' : '- '}
              {fmtHM(Math.abs(saldoBancoMinutos))}
            </p>
            <p className="text-[10.5px] font-semibold text-white/40 mt-0.5 truncate whitespace-nowrap">Banco de horas</p>
          </div>

          {/* Frequência (mês) */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border border-white/10 shadow-xl flex flex-col justify-center min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2 border border-teal-500/30 shrink-0">
              <Percent size={16} />
            </div>
            <p className="text-base sm:text-lg lg:text-xl font-black text-white leading-tight truncate whitespace-nowrap">{frequenciaPct}%</p>
            <p className="text-[10.5px] font-semibold text-white/40 mt-0.5 truncate whitespace-nowrap">Frequência (mês)</p>
          </div>
        </div>
      </div>

      {/* Abas de Navegação do Perfil */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              abaAtiva === item.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
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
            <div className="lg:col-span-3 bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-white">Registro de hoje</h3>
                  <p className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                    <Calendar size={12} className="text-emerald-400" />
                    {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => onEditarRegistro(hoje, hojeReg)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Pencil size={12} /> Lançar / Editar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Linha do tempo dos 4 horários */}
                <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {/* Entrada */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 ring-1 ring-emerald-500/30" />
                    <span className="text-xs font-semibold text-white/70 flex items-center gap-2">
                      <LogIn size={15} className="text-emerald-400" /> Entrada
                    </span>
                    <span className="font-bold text-white text-sm font-mono">
                      {hhmm(hojeReg?.entrada)}
                    </span>
                  </div>

                  {/* Início Intervalo */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 ring-1 ring-amber-400/30" />
                    <span className="text-xs font-semibold text-white/70 flex items-center gap-2">
                      <Coffee size={15} className="text-amber-400" /> Início do Intervalo
                    </span>
                    <span className="font-bold text-white text-sm font-mono">
                      {hhmm(hojeReg?.inicio_intervalo)}
                    </span>
                  </div>

                  {/* Fim Intervalo */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 ring-1 ring-amber-400/30" />
                    <span className="text-xs font-semibold text-white/70 flex items-center gap-2">
                      <Coffee size={15} className="text-amber-400" /> Fim do Intervalo
                    </span>
                    <span className="font-bold text-white text-sm font-mono">
                      {hhmm(hojeReg?.fim_intervalo)}
                    </span>
                  </div>

                  {/* Saída */}
                  <div className="flex items-center justify-between gap-3 relative">
                    <span className="absolute -left-4 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-slate-900 ring-1 ring-rose-500/30" />
                    <span className="text-xs font-semibold text-white/70 flex items-center gap-2">
                      <LogOut size={15} className="text-rose-400" /> Saída
                    </span>
                    <span className="font-bold text-white text-sm font-mono">
                      {hhmm(hojeReg?.saida)}
                    </span>
                  </div>
                </div>

                {/* 2 Mini Cards Laterais */}
                <div className="flex flex-col justify-between gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-300">
                        Horas trabalhadas hoje
                      </p>
                      <p className="text-lg font-black text-white">
                        {fmtHM(analiseHoje.trabalhados)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                      <Scale size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white/50">Banco de horas</p>
                      <p
                        className={`text-lg font-black ${
                          saldoBancoMinutos >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white">Jornada de Trabalho</h3>
                  <button
                    onClick={onEditarJornada}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <Clock size={14} className="text-white/40" /> Horário de entrada
                    </span>
                    <b className="text-white font-mono">
                      {hhmm(jornadaHoje?.entrada || '08:00')}
                    </b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <Clock size={14} className="text-white/40" /> Horário de saída
                    </span>
                    <b className="text-white font-mono">
                      {hhmm(jornadaHoje?.saida || '17:00')}
                    </b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <Coffee size={14} className="text-white/40" /> Intervalo
                    </span>
                    <b className="text-white font-mono">
                      {hhmm(jornadaHoje?.inicio_intervalo || '12:00')} -{' '}
                      {hhmm(jornadaHoje?.fim_intervalo || '13:00')}
                    </b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-white/40" /> Dias de trabalho
                    </span>
                    <b className="text-white">Segunda a Sábado</b>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <FileText size={14} className="text-white/40" /> Carga horária diária
                    </span>
                    <b className="text-white">8 horas</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linha Inferior: Últimos registros de ponto + Resumo do mês */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Tabela: Últimos registros de ponto */}
            <div className="lg:col-span-3 bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-white">Últimos registros de ponto</h3>
                <button
                  onClick={() => setAbaAtiva('registros')}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  Ver todos <ArrowRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/40 font-semibold border-b border-white/10 text-left uppercase tracking-wider text-[10px]">
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
                  <tbody className="divide-y divide-white/5">
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
                        <tr key={d} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 pr-3 font-semibold text-white whitespace-nowrap">
                            {dataFormatada} ({diaSemana})
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-white/80">
                            {hhmm(r?.entrada)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-white/80">
                            {hhmm(r?.inicio_intervalo)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-white/80">
                            {hhmm(r?.fim_intervalo)}
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-white/80">{hhmm(r?.saida)}</td>
                          <td className="py-2.5 pr-3 font-semibold text-white">
                            {fmtHM(a.trabalhados)}
                          </td>
                          <td className="py-2.5 pr-3">{statusPill(a.status)}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => onEditarRegistro(d, r)}
                              className="p-1 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-white/10 cursor-pointer"
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
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white">Resumo do mês</h3>
                  <input
                    type="month"
                    value={mesSelecionado}
                    onChange={(e) => setMesSelecionado(e.target.value)}
                    className="text-xs bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-white font-semibold focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400" /> Dias trabalhados
                    </span>
                    <b className="text-white font-bold">{diasTrabalhados}</b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-400" /> Atrasos
                    </span>
                    <b className="text-white font-bold">{atrasos}</b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <XCircle size={15} className="text-rose-400" /> Faltas
                    </span>
                    <b className="text-white font-bold">{faltas}</b>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <Clock size={15} className="text-sky-400" /> Horas trabalhadas
                    </span>
                    <b className="text-white font-bold">{fmtHM(minMes)}</b>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/60 font-medium flex items-center gap-2">
                      <Scale size={15} className="text-purple-400" /> Banco de horas
                    </span>
                    <b
                      className={`font-bold ${
                        saldoBancoMinutos >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white">
              Todos os registros ({mesSelecionado})
            </h3>
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-white font-semibold focus:border-emerald-500/50"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 font-semibold border-b border-white/10 text-left uppercase tracking-wider text-[10px]">
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
              <tbody className="divide-y divide-white/5">
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
                    <tr key={d} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-white whitespace-nowrap">
                        {dataFormatada} ({diaSemana})
                        {r?.editado_manual && (
                          <span
                            title="Editado manualmente"
                            className="ml-1 text-emerald-400 font-bold"
                          >
                            ✎
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-white/80">{hhmm(r?.entrada)}</td>
                      <td className="py-2.5 pr-3 font-mono text-white/80">
                        {hhmm(r?.inicio_intervalo)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-white/80">
                        {hhmm(r?.fim_intervalo)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-white/80">{hhmm(r?.saida)}</td>
                      <td className="py-2.5 pr-3 font-semibold text-white">
                        {fmtHM(a.trabalhados)}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-emerald-400">
                        {a.extra ? fmtHM(a.extra) : '—'}
                      </td>
                      <td className="py-2.5 pr-3">{statusPill(a.status)}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onEditarRegistro(d, r)}
                          className="p-1 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-white/10 cursor-pointer"
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
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Espelho de Ponto Individual de Trabalho
              </h3>
              <p className="text-xs text-white/50">
                Empresa: <b className="text-white">Rafa Arts Graphics</b> • Período: <b className="text-white">{mesSelecionado}</b>
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs shadow-xs border border-white/10 cursor-pointer"
            >
              <Printer size={14} /> Imprimir / Exportar PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div>
              <span className="text-white/40 block font-medium">Funcionário</span>
              <span className="font-bold text-white">{nome}</span>
            </div>
            <div>
              <span className="text-white/40 block font-medium">Cargo / Função</span>
              <span className="font-bold text-white">{setor}</span>
            </div>
            <div>
              <span className="text-white/40 block font-medium">Matrícula</span>
              <span className="font-bold text-white">{matricula}</span>
            </div>
            <div>
              <span className="text-white/40 block font-medium">ID Ponto Relógio</span>
              <span className="font-bold font-mono text-white">{idPonto}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-white/10">
              <thead>
                <tr className="bg-white/5 text-white/70 font-bold border-b border-white/10 text-left">
                  <th className="p-2 border-r border-white/10">Dia</th>
                  <th className="p-2 border-r border-white/10">Entrada</th>
                  <th className="p-2 border-r border-white/10">Início Intervalo</th>
                  <th className="p-2 border-r border-white/10">Fim Intervalo</th>
                  <th className="p-2 border-r border-white/10">Saída</th>
                  <th className="p-2 border-r border-white/10">Total</th>
                  <th className="p-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
                      <td className="p-2 border-r border-white/10 font-semibold text-white/90">
                        {diaNum} - {diaSemana}
                      </td>
                      <td className="p-2 border-r border-white/10 font-mono text-white/80">
                        {hhmm(r?.entrada)}
                      </td>
                      <td className="p-2 border-r border-white/10 font-mono text-white/80">
                        {hhmm(r?.inicio_intervalo)}
                      </td>
                      <td className="p-2 border-r border-white/10 font-mono text-white/80">
                        {hhmm(r?.fim_intervalo)}
                      </td>
                      <td className="p-2 border-r border-white/10 font-mono text-white/80">{hhmm(r?.saida)}</td>
                      <td className="p-2 border-r border-white/10 font-bold text-white">
                        {fmtHM(a.trabalhados)}
                      </td>
                      <td className="p-2">{statusPill(a.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-8 border-t border-white/10 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="space-y-1">
              <div className="border-b border-white/30 w-48 mx-auto" />
              <p className="font-bold text-white">Assinatura do Empregador</p>
              <p className="text-white/40 text-[10px]">Rafa Arts Graphics</p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-white/30 w-48 mx-auto" />
              <p className="font-bold text-white">Assinatura do Funcionário</p>
              <p className="text-white/40 text-[10px]">{nome}</p>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: AJUSTES */}
      {abaAtiva === 'ajustes' && (
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white">
            Ajustes e Inconsistências de Batidas
          </h3>
          <p className="text-xs text-white/50">
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
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">
                        {format(new Date(`${d}T12:00:00`), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </span>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        Batidas registradas:{' '}
                        <span className="font-mono text-white/80">
                          {hhmm(r?.entrada)} / {hhmm(r?.saida)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusPill(a.status)}
                      <button
                        onClick={() => onEditarRegistro(d, r)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
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
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white">Extrato do Banco de Horas</h3>
              <p className="text-xs text-white/50">
                Créditos possuem validade de 6 meses conforme convenção.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-white/40 font-semibold block">Saldo Atual</span>
              <span
                className={`text-xl font-black ${
                  saldoBancoMinutos >= 0 ? 'text-emerald-400' : 'text-rose-400'
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
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white">Jornada Semanal Cadastrada</h3>
              <p className="text-xs text-white/50">
                Horários de trabalho programados para cada dia da semana
              </p>
            </div>
            <button
              onClick={onEditarJornada}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              <Pencil size={13} /> Editar Grade Semanal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
