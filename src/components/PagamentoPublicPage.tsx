import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, Copy, FileText, Lock, Pointer, ShieldCheck, Tag, Zap } from 'lucide-react';
import { supabase } from '../supabase';
import { buildPixPayload } from '../lib/pix';
import { PixQrImage } from './PixQrImage';
import { fmtValidade } from '../lib/cobrancaPix';

// Página pública do link de pagamento (rota /pagar/:token — ver AppRoot.tsx).
// O cliente vê o resumo da nota, escolhe o valor (ex.: entrada de 50% ou total), paga por QR Code ou
// PIX copia e cola e, quando o pagamento é confirmado, aparece o selo verde. A confirmação e a baixa
// na nota são feitas pelo servidor (api/_lib/pagar-link.js). Nenhum dado sensível é exibido aqui.

interface Opcao { id: string; label: string; valor_centavos: number; valor_original_centavos?: number; desconto_centavos?: number }
interface LinkPublico {
  token: string;
  cliente_nome: string | null;
  resumo: string | null;
  opcoes: Opcao[];
  pix: { key: string; keyType?: any; beneficiaryName: string; city: string; bank?: string | null };
  status: string;
  expira_em: string;
}

const INTERVALO_MS = 8000;
// Depois de 10 min a confirmação já é feita pelo servidor (aviso do Gmail); a tela só acompanha, mais devagar.
const INTERVALO_LENTO_MS = 30000;
const FASE_RAPIDA_MS = 10 * 60 * 1000;
const fmt = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;

/** Logo do PIX: quatro losangos arredondados em cruz. */
const PixLogo = ({ size = 36, cor = '#2de3a0' }: { size?: number; cor?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className="shrink-0">
    {[[24, 12], [36, 24], [24, 36], [12, 24]].map(([cx, cy], i) => (
      <rect key={i} x={cx - 7.75} y={cy - 7.75} width="15.5" height="15.5" rx="3.6" transform={`rotate(45 ${cx} ${cy})`} fill={cor} />
    ))}
  </svg>
);

const descontoDe = (o: Opcao) => Math.max(0, o.desconto_centavos ?? 0);
const originalDe = (o: Opcao) => o.valor_original_centavos ?? o.valor_centavos + descontoDe(o);

function tokenDaUrl(): string | null {
  const m = window.location.pathname.match(/^\/pagar\/([0-9a-fA-F]{32})\/?$/);
  return m ? m[1].toLowerCase() : null;
}

async function chamarApi(corpo: Record<string, unknown>): Promise<{ ok: boolean; dados: any }> {
  try {
    const r = await fetch('/api/ai?rota=pagar-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    return { ok: r.ok, dados: await r.json().catch(() => ({})) };
  } catch {
    return { ok: false, dados: {} };
  }
}

export default function PagamentoPublicPage() {
  const token = tokenDaUrl();
  const [carregando, setCarregando] = useState(true);
  const [link, setLink] = useState<LinkPublico | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [opcao, setOpcao] = useState<Opcao | null>(null);
  const [verOpcoes, setVerOpcoes] = useState(false); // passo 2: lista de opções (toque no botão grande)
  const [selecionada, setSelecionada] = useState<Opcao | null>(null);
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [expiraEm, setExpiraEm] = useState<number>(0);
  const [iniciando, setIniciando] = useState(false);
  const [pago, setPago] = useState(false);
  const [expirou, setExpirou] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicioRef = useRef(0);

  useEffect(() => {
    if (!token) { setErro('Link inválido.'); setCarregando(false); return; }
    let ativo = true;
    (async () => {
      const { data, error } = await supabase
        .from('pagamento_links')
        .select('token, cliente_nome, resumo, opcoes, pix, status, expira_em')
        .eq('token', token)
        .maybeSingle();
      if (!ativo) return;
      if (error || !data) setErro('Link não encontrado.');
      else if (data.status === 'pago') { setLink(data as LinkPublico); setPago(true); }
      else if (data.status !== 'ativo') setErro('Este link foi cancelado.');
      else if (Date.now() >= new Date(data.expira_em).getTime()) setErro('Este link expirou. Peça um novo link.');
      else setLink(data as LinkPublico);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [token]);

  const escolher = async (o: Opcao) => {
    if (!token || iniciando) return;
    setIniciando(true);
    setErro(null);
    const r = await chamarApi({ acao: 'registrar', token, opcaoId: o.id });
    setIniciando(false);
    if (!r.ok || !r.dados?.pendenteId) { setErro(r.dados?.erro || 'Não foi possível iniciar o pagamento agora. Tente de novo.'); return; }
    inicioRef.current = Date.now();
    setOpcao(o);
    setPendenteId(r.dados.pendenteId);
    setExpiraEm(new Date(r.dados.expiraEm).getTime());
    setExpirou(false);
  };

  const trocarValor = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVerOpcoes(true);
    setOpcao(null);
    setPendenteId(null);
    setExpirou(false);
  };

  const proximoIntervalo = () => (Date.now() - inicioRef.current < FASE_RAPIDA_MS ? INTERVALO_MS : INTERVALO_LENTO_MS);

  const consultar = useCallback(async () => {
    if (!token || !pendenteId) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (Date.now() >= expiraEm) { setExpirou(true); return; }
    // Aba escondida: não gasta requisição; a consulta volta sozinha quando a aba reaparecer.
    if (document.visibilityState === 'hidden') { timerRef.current = setTimeout(consultar, proximoIntervalo()); return; }
    const r = await chamarApi({ acao: 'checar', token, pendenteId });
    if (r.dados?.pago) { setPago(true); return; }
    timerRef.current = setTimeout(consultar, proximoIntervalo());
  }, [token, pendenteId, expiraEm]);

  useEffect(() => {
    if (!pendenteId || pago) return;
    timerRef.current = setTimeout(consultar, INTERVALO_MS);
    const aoVoltar = () => { if (document.visibilityState === 'visible') void consultar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pendenteId, pago, consultar]);

  const copiar = async (valor: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      window.prompt('Copie o código:', valor);
    }
  };

  const moldura = (filhos: React.ReactNode) => (
    <div
      className="min-h-screen text-white flex items-start sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'radial-gradient(120% 60% at 0% 0%, rgba(16,185,129,0.16) 0%, transparent 55%), radial-gradient(90% 50% at 100% 100%, rgba(16,185,129,0.12) 0%, transparent 60%), linear-gradient(180deg, #06101f 0%, #050b16 100%)' }}
    >
      <div
        className="w-full max-w-[430px] rounded-[28px] border border-emerald-400/20 p-4 sm:p-6 space-y-4"
        style={{ background: 'linear-gradient(180deg, rgba(10,22,40,0.92) 0%, rgba(6,14,27,0.96) 100%)', boxShadow: '0 0 60px rgba(16,185,129,0.10), 0 20px 50px rgba(0,0,0,0.5)' }}
      >
        {filhos}
      </div>
    </div>
  );

  if (carregando) return moldura(<p className="text-center text-sm text-slate-400">Carregando...</p>);

  if (erro && !link) return moldura(<p className="text-center text-sm font-bold text-rose-300">{erro}</p>);

  if (!link) return null;

  if (pago) {
    return moldura(
      <div className="flex flex-col items-center gap-3 py-6 text-center animate-in zoom-in-95 fade-in duration-300">
        <CheckCircle2 size={96} strokeWidth={1.8} className="text-[#2de3a0]" />
        <h1 className="text-xl font-black uppercase tracking-wide text-[#2de3a0]">PIX confirmado</h1>
        {opcao && <p className="text-2xl font-black">{fmt(opcao.valor_centavos)}</p>}
        {opcao && descontoDe(opcao) > 0 && (
          <p className="text-xs font-semibold text-slate-300">Valor original {fmt(originalDe(opcao))} · desconto de {fmt(descontoDe(opcao))}</p>
        )}
        <p className="text-sm text-slate-300">Obrigado{link.cliente_nome ? `, ${link.cliente_nome}` : ''}! Recebemos o seu pagamento.</p>
      </div>
    );
  }

  const cabecalho = (
    <>
      <div className="flex items-center gap-4">
        <PixLogo size={72} />
        <div className="leading-none">
          <h1 className="text-[22px] font-black uppercase tracking-tight text-white">Pagamento via</h1>
          <div className="text-[64px] font-black leading-[0.95] tracking-tight text-[#2de3a0]">PIX</div>
        </div>
      </div>
      <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Rápido • Seguro • Sem burocracia</p>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="break-words text-[17px] font-black text-white">Olá{link.cliente_nome ? `, ${link.cliente_nome.toUpperCase()}` : ''}!</p>
          {link.resumo && <p className="break-words text-[13px] font-semibold text-slate-400">Referente a: {link.resumo.toUpperCase()}</p>}
          {link.expira_em && <p className="text-[12px] font-semibold text-slate-500">Válido até {fmtValidade(link.expira_em)}</p>}
        </div>
        <div className="shrink-0 w-12 h-12 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-slate-300"><FileText size={24} strokeWidth={1.6} /></div>
      </div>
    </>
  );

  const selosConfianca = (
    <div className="grid grid-cols-3 gap-1 border-t border-white/10 pt-4 text-[11px] font-semibold text-slate-300">
      {[[ShieldCheck, 'Pagamento seguro'], [Zap, 'Aprovação imediata'], [Lock, 'Seus dados protegidos']].map(([Icone, texto], i) => {
        const I = Icone as typeof ShieldCheck;
        return (
          <div key={i} className="flex flex-col items-center gap-1 text-center leading-tight">
            <I size={26} strokeWidth={1.5} className="text-[#2de3a0]" />
            <span>{texto as string}</span>
          </div>
        );
      })}
    </div>
  );

  const rodape = (
    <div className="flex items-center justify-center gap-4 pt-1">
      <PixLogo size={26} />
      <span className="text-[22px] font-light tracking-tight text-white">pix</span>
      <span className="h-8 w-px bg-emerald-400/40" />
      <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-slate-400">Pagamento rápido<br />e seguro</span>
    </div>
  );

  // Botão grande, claramente clicável: ícone Pix | PAGAR + valor + VIA PIX | seta.
  const botaoGrande = (rotulo: string, valorTxt: string, onClick: () => void, desabilitado = false, valorPequeno = false) => (
    <button
      type="button"
      disabled={desabilitado}
      onClick={onClick}
      className="group w-full flex items-center gap-3 rounded-[26px] border border-emerald-300/50 px-4 py-4 text-left cursor-pointer transition-transform active:scale-[.985] disabled:opacity-60"
      style={{ background: 'linear-gradient(180deg, #0fd68f 0%, #079a68 100%)', boxShadow: '0 0 34px rgba(45,227,160,0.35), inset 0 1px 0 rgba(255,255,255,0.35)' }}
    >
      <PixLogo size={44} cor="#ffffff" />
      <span className="h-14 w-px bg-white/30" />
      <span className="flex-1 min-w-0 leading-tight">
        <span className="block text-[18px] font-black uppercase tracking-wide text-white">{rotulo}</span>
        <span className={'block whitespace-nowrap font-black text-white ' + (valorPequeno ? 'text-[22px]' : 'text-[34px]')}>{valorTxt}</span>
        <span className="block text-[15px] font-bold uppercase tracking-wide text-white/90">via PIX</span>
      </span>
      <ChevronRight size={30} strokeWidth={2.6} className="shrink-0 text-white transition-transform group-hover:translate-x-1" />
    </button>
  );

  // Passo 1: botão grande com o valor ("Toque para ver as opções de pagamento")
  if (!verOpcoes && (!opcao || !pendenteId)) {
    const unica = link.opcoes.length === 1 ? link.opcoes[0] : null;
    const menor = Math.min(...link.opcoes.map(o => o.valor_centavos));
    return moldura(
      <>
        {cabecalho}
        <div className="flex flex-col items-center gap-1 pt-1 text-center">
          <Pointer size={44} strokeWidth={1.6} className="text-[#2de3a0]" />
          <h2 className="text-[26px] font-black uppercase leading-[1.05] text-white">Escolha quanto<br /><span className="text-[#2de3a0]">deseja pagar</span></h2>
          <p className="text-[15px] font-semibold text-slate-300">Toque no botão abaixo para ver<br />as opções de pagamento.</p>
        </div>
        {unica && descontoDe(unica) > 0 && (
          <p className="text-center text-[13px] font-bold leading-snug text-amber-300">
            <Tag size={15} className="mr-1 inline align-[-2px]" />
            Desconto de {fmt(descontoDe(unica))} no Pix<br />de {fmt(originalDe(unica))} por {fmt(unica.valor_centavos)}
          </p>
        )}
        {unica
          ? botaoGrande('Pagar', fmt(unica.valor_centavos), () => { setSelecionada(unica); setVerOpcoes(true); })
          : botaoGrande('Ver opções', `a partir de ${fmt(menor)}`, () => setVerOpcoes(true), false, true)}
        {selosConfianca}
        {rodape}
      </>
    );
  }

  // Passo 2: opções disponíveis, com valor original, desconto e valor final ANTES de confirmar
  if (!opcao || !pendenteId) {
    const ativa = selecionada && link.opcoes.some(o => o.id === selecionada.id) ? selecionada : (link.opcoes.length === 1 ? link.opcoes[0] : null);
    return moldura(
      <>
        {cabecalho}
        <h2 className="text-center text-[22px] font-black uppercase leading-tight text-white">Escolha quanto <span className="text-[#2de3a0]">deseja pagar</span></h2>
        <div className="space-y-2.5">
          {link.opcoes.map(o => {
            const marcado = ativa?.id === o.id;
            const desc = descontoDe(o);
            return (
              <button
                key={o.id}
                type="button"
                disabled={iniciando}
                onClick={() => setSelecionada(o)}
                className={'w-full rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer disabled:opacity-50 ' + (marcado ? 'border-[#2de3a0] bg-emerald-500/15 shadow-[0_0_22px_rgba(45,227,160,0.22)]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]')}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-black uppercase leading-tight tracking-wide">
                    <span className={'inline-block h-4 w-4 shrink-0 rounded-full border-2 ' + (marcado ? 'border-[#2de3a0] bg-[#2de3a0]' : 'border-slate-500')} />
                    <span className="min-w-0">{o.label}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[22px] font-black text-[#2de3a0]">{fmt(o.valor_centavos)}</span>
                </div>
                {desc > 0 && (
                  <div className="mt-1.5 space-y-0.5 pl-6 text-[12px] font-semibold text-slate-400">
                    <div className="flex justify-between"><span>Valor original</span><span className="line-through">{fmt(originalDe(o))}</span></div>
                    <div className="flex justify-between text-amber-300"><span>Desconto no Pix</span><span>- {fmt(desc)}</span></div>
                    <div className="flex justify-between font-black text-white"><span>Você paga</span><span>{fmt(o.valor_centavos)}</span></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {erro && <p className="text-xs font-bold text-rose-300">{erro}</p>}
        {ativa
          ? botaoGrande(iniciando ? 'Gerando PIX...' : 'Confirmar', fmt(ativa.valor_centavos), () => escolher(ativa), iniciando, true)
          : <p className="text-center text-[13px] font-bold uppercase tracking-wide text-slate-400">Toque em uma opção para continuar</p>}
        {link.opcoes.length > 0 && (
          <button type="button" onClick={() => { setVerOpcoes(false); setSelecionada(null); }} className="w-full text-center text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-white cursor-pointer bg-transparent border-0">
            Voltar
          </button>
        )}
        {selosConfianca}
      </>
    );
  }

  // Passo 2: pagar (QR Code + copia e cola)
  const payload = buildPixPayload({
    key: link.pix.key,
    keyType: link.pix.keyType,
    beneficiaryName: link.pix.beneficiaryName,
    city: link.pix.city,
    amount: Number((opcao.valor_centavos / 100).toFixed(2)),
  });

  return moldura(
    <>
      {cabecalho}
      <div className="rounded-xl border border-white/10 bg-[#0c1829] px-4 py-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="min-w-0 text-[11px] font-extrabold uppercase leading-tight tracking-wide text-slate-400">{opcao.label}</span>
          <span className="shrink-0 whitespace-nowrap pl-2 text-2xl font-black text-[#2de3a0]">{fmt(opcao.valor_centavos)}</span>
        </div>
        {descontoDe(opcao) > 0 && (
          <div className="flex justify-between text-[12px] font-semibold text-slate-400">
            <span>Original {fmt(originalDe(opcao))}</span>
            <span className="text-amber-300">Desconto - {fmt(descontoDe(opcao))}</span>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-2 w-[200px] h-[200px]">
          <PixQrImage payload={payload} className="block h-full w-full object-contain" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => copiar(payload)}
        className="h-11 w-full rounded-xl border border-red-500/80 bg-[#3a1424]/70 text-red-300 text-[13px] font-black uppercase tracking-wider flex items-center justify-center gap-2.5 active:scale-[.99] transition-all cursor-pointer"
      >
        <Copy size={18} strokeWidth={1.8} />
        {copiado ? 'PIX copiado!' : 'Copia e cola'}
      </button>
      <p className="text-[11px] text-slate-400 text-center">Beneficiário: {link.pix.beneficiaryName}{link.pix.bank ? ` · ${link.pix.bank}` : ''}</p>

      <p className="text-center text-[11px] font-semibold text-slate-400">
        {expirou
          ? 'O prazo deste PIX acabou. Se já pagou, aguarde a confirmação; senão, escolha o valor de novo (se o link ainda estiver válido).'
          : 'Aguardando o PIX — esta tela confirma sozinha assim que o pagamento chegar.'}
      </p>
      <button type="button" onClick={trocarValor} className="w-full text-center text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-white cursor-pointer bg-transparent border-0">
        Trocar valor
      </button>
    </>
  );
}
