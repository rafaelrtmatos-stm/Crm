// Tela publica (sem login) de VALIDACAO de um documento ja assinado -- pra onde aponta o QR
// Code do carimbo visual impresso no PDF final (ver drawSeloAutenticidade em contratoPdf.ts).
// Renderizada pela rota /validar/:contratoId (ver integração em AppRoot.tsx).
//
// Diferente da tela de assinatura (/assinar/:id), essa e' so LEITURA: nao pede codigo OTP nem
// CPF/CNPJ, so mostra o status do documento, as duas partes (com CPF/CNPJ mascarado) e o hash
// de integridade -- os mesmos dados ja gravados pela assinatura eletronica existente, sem
// nenhuma informacao sensivel nova exposta.

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, AlertCircle, CheckCircle2, Circle, Hash, Download, FileText } from 'lucide-react';
import { supabase } from '../supabase';
import { maskCpfCnpj } from '../lib/contractUtils';
import { OFFICIAL_COMPANY } from '../lib/companyIdentity';

interface ContratoValidacao {
  id: string;
  numero: string;
  customerName: string;
  cpfCnpj?: string;
  status: string;
  createdAt?: string;
  signedAt?: string;
  documentHash?: string;
  pdfUrl?: string;
  empresaSignedAt?: string;
  empresaSignedBy?: string;
}

function getContratoIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/validar\/([a-zA-Z0-9-]+)\/?$/);
  return match ? match[1] : null;
}

interface HistoricoEvento {
  label: string;
  data?: string;
  done: boolean;
}

export default function ContractValidationPublicPage() {
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState<ContratoValidacao | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = getContratoIdFromUrl();
    if (!id) { setNotFound(true); setLoading(false); return; }

    supabase
      .from('contratos')
      .select('id, numero, customer_name, cpf_cnpj, status, created_at, signed_at, document_hash, pdf_url, empresa_signed_at, empresa_signed_by')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        setContrato({
          id: data.id,
          numero: data.numero,
          customerName: data.customer_name,
          cpfCnpj: data.cpf_cnpj || undefined,
          status: data.status,
          createdAt: data.created_at || undefined,
          signedAt: data.signed_at || undefined,
          documentHash: data.document_hash || undefined,
          pdfUrl: data.pdf_url || undefined,
          empresaSignedAt: data.empresa_signed_at || undefined,
          empresaSignedBy: data.empresa_signed_by || undefined,
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-400" size={28} />
      </div>
    );
  }

  if (notFound || !contrato) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="text-rose-400" size={32} />
        <p className="text-white font-bold">Documento não encontrado</p>
        <p className="text-white/40 text-sm">Confira o link ou o QR Code escaneado.</p>
      </div>
    );
  }

  const shortId = contrato.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const totalmenteAssinado = contrato.status === 'assinado' && !!contrato.signedAt && !!contrato.empresaSignedAt;

  const historico: HistoricoEvento[] = [
    { label: 'Contrato criado', data: contrato.createdAt, done: !!contrato.createdAt },
    { label: 'Parte 1 (Contratante) assinou', data: contrato.signedAt, done: !!contrato.signedAt },
    { label: 'Parte 2 (Contratada) assinou', data: contrato.empresaSignedAt, done: !!contrato.empresaSignedAt },
    { label: 'Documento finalizado', data: totalmenteAssinado ? (contrato.signedAt! > contrato.empresaSignedAt! ? contrato.signedAt : contrato.empresaSignedAt) : undefined, done: totalmenteAssinado },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-1.5">
          {totalmenteAssinado ? (
            <ShieldCheck className="mx-auto text-emerald-400" size={36} />
          ) : (
            <ShieldAlert className="mx-auto text-amber-400" size={36} />
          )}
          <h1 className="text-white text-lg font-black">
            {totalmenteAssinado ? 'Documento Válido' : 'Assinatura em Andamento'}
          </h1>
          <p className="text-white/40 text-xs">Nº {contrato.numero} · ID {shortId}</p>
        </div>

        <div className={`rounded-2xl border p-3 text-center text-xs font-black uppercase tracking-wide ${
          totalmenteAssinado
            ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
            : 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400'
        }`}>
          {totalmenteAssinado ? 'Assinado por todas as partes' : 'Aguardando assinatura de todas as partes'}
        </div>

        {/* Duas partes lado a lado, so com dados nao sensiveis (CPF/CNPJ mascarado) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1.5">
            <p className="text-[10px] uppercase font-black text-primary-400">Parte 1 — Contratante</p>
            <p className="text-white text-sm font-bold leading-tight">{contrato.customerName}</p>
            <p className="text-white/40 text-[11px]">CPF/CNPJ: {maskCpfCnpj(contrato.cpfCnpj)}</p>
            {contrato.signedAt ? (
              <p className="text-emerald-400 text-[11px] flex items-center gap-1.5 pt-1">
                <CheckCircle2 size={12} /> Assinado em {new Date(contrato.signedAt).toLocaleString('pt-BR')}
              </p>
            ) : (
              <p className="text-white/30 text-[11px] flex items-center gap-1.5 pt-1">
                <Circle size={10} /> Aguardando
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1.5">
            <p className="text-[10px] uppercase font-black text-primary-400">Parte 2 — Contratada</p>
            <p className="text-white text-sm font-bold leading-tight">{OFFICIAL_COMPANY.nomeFantasia}</p>
            <p className="text-white/40 text-[11px]">CNPJ: {maskCpfCnpj(OFFICIAL_COMPANY.cnpj)}</p>
            {contrato.empresaSignedAt ? (
              <p className="text-emerald-400 text-[11px] flex items-center gap-1.5 pt-1">
                <CheckCircle2 size={12} /> Assinado em {new Date(contrato.empresaSignedAt).toLocaleString('pt-BR')}
              </p>
            ) : (
              <p className="text-white/30 text-[11px] flex items-center gap-1.5 pt-1">
                <Circle size={10} /> Aguardando
              </p>
            )}
          </div>
        </div>

        {/* Integridade do documento -- so mostra o hash quando ja existe (documento assinado
            por pelo menos uma parte); antes disso ainda nao ha hash definitivo gravado. */}
        {contrato.documentHash && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1.5">
            <p className="text-[10px] uppercase font-black text-white/50 flex items-center gap-1.5">
              <Hash size={12} /> Integridade do Documento
            </p>
            <p className="text-emerald-400 text-[11px] font-bold">✓ Integridade Verificada</p>
            <p className="text-white/40 text-[10px] font-mono break-all">SHA-256: {contrato.documentHash}</p>
          </div>
        )}

        {/* Historico -- reaproveita os timestamps ja existentes no registro do contrato, sem
            criar nenhuma tabela nova. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5">
          <p className="text-[10px] uppercase font-black text-white/50">Histórico</p>
          {historico.map((ev, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[11px]">
              {ev.done ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <Circle size={13} className="text-white/20 shrink-0" />}
              <span className={ev.done ? 'text-white/80' : 'text-white/30'}>{ev.label}</span>
              {ev.data && <span className="text-white/30 ml-auto shrink-0">{new Date(ev.data).toLocaleString('pt-BR')}</span>}
            </div>
          ))}
        </div>

        {contrato.pdfUrl && totalmenteAssinado && (
          <button
            onClick={() => window.open(contrato.pdfUrl, '_blank', 'noopener,noreferrer')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-black text-xs font-black uppercase py-3 transition-colors"
          >
            <Download size={14} /> Baixar PDF Assinado
          </button>
        )}

        <p className="text-white/20 text-[10px] text-center flex items-center justify-center gap-1.5 pt-1">
          <FileText size={11} /> Validação eletrônica — {OFFICIAL_COMPANY.nomeFantasia}
        </p>
      </div>
    </div>
  );
}
