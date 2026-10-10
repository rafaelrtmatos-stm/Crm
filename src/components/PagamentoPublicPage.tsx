import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { supabase } from '../supabase';
import { buildPixPayload } from '../lib/pix';
import { PixQrImage } from './PixQrImage';
import { fmtValidade } from '../lib/cobrancaPix';

// Página pública do link de pagamento (rota /pagar/:token — ver AppRoot.tsx).
// O cliente vê o resumo da nota, escolhe o valor (ex.: entrada de 50% ou total), paga por QR Code ou
// PIX copia e cola e, quando o pagamento é confirmado, aparece o selo verde. A confirmação e a baixa
// na nota são feitas pelo servidor (api/_lib/pagar-link.js). Nenhum dado sensível é exibido aqui.

interface Opcao { id: string; label: string; valor_centavos: number }
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
    <div className="min-h-screen bg-[#070d18] text-white flex items-start sm:items-center justify-center p-3 sm:p-4">
      {/* Mesmo padrão do modal PIX do sistema: card compacto (w-fit), largura guiada pelo QR Code. */}
      <div className="w-fit max-w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1a2d] to-[#0a1424] shadow-2xl p-4 sm:p-5">
        <div className="w-[260px] max-w-full space-y-3">
          {filhos}
        </div>
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
        <p className="text-sm text-slate-300">Obrigado{link.cliente_nome ? `, ${link.cliente_nome}` : ''}! Recebemos o seu pagamento.</p>
      </div>
    );
  }

  const cabecalho = (
    <div className="space-y-1">
      <h1 className="whitespace-nowrap text-[17px] font-black uppercase tracking-tight">
        Pagamento via <span className="text-[#2de3a0]">PIX</span>
      </h1>
      {link.cliente_nome && <p className="break-words text-sm text-slate-300">Olá, {link.cliente_nome}!</p>}
      {link.resumo && <p className="break-words text-xs text-slate-400">Referente a: {link.resumo}</p>}
      {link.expira_em && <p className="text-[11px] font-semibold text-slate-500">Válido até {fmtValidade(link.expira_em)}</p>}
    </div>
  );

  // Passo 1: escolher o valor
  if (!opcao || !pendenteId) {
    return moldura(
      <>
        {cabecalho}
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Escolha quanto deseja pagar agora</p>
        <div className="space-y-2">
          {link.opcoes.map(o => (
            <button
              key={o.id}
              type="button"
              disabled={iniciando}
              onClick={() => escolher(o)}
              className="w-full flex items-center justify-between rounded-xl border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-3 text-left transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="text-sm font-black uppercase tracking-wide">{o.label}</span>
              <span className="text-lg font-black text-[#2de3a0]">{fmt(o.valor_centavos)}</span>
            </button>
          ))}
        </div>
        {erro && <p className="text-xs font-bold text-rose-300">{erro}</p>}
        {iniciando && <p className="text-xs text-slate-400">Gerando o PIX...</p>}
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
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0c1829] px-4 py-2.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{opcao.label}</span>
        <span className="text-2xl font-black text-[#2de3a0]">{fmt(opcao.valor_centavos)}</span>
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
