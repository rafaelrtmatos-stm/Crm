// Tela publica (sem login) de validacao de assinatura eletronica -- rota /validar.
// Qualquer pessoa (nao so quem recebeu o link do contrato) pode conferir a autenticidade de UMA
// assinatura especifica de duas formas:
//   1) Digitando o Codigo de Verificacao (ID exclusivo da assinatura, formato XXXX-XXXX-XXXX-XXXX,
//      impresso no carimbo do PDF e no QR Code) -- busca no banco e mostra um resumo publico
//      (nome mascarado, data/hora, hash) sem expor o contrato inteiro.
//   2) Enviando o proprio arquivo PDF -- calcula o SHA-256 dos bytes do arquivo no navegador e
//      compara contra contratos.pdf_hash (gravado no momento em que o PDF final foi gerado, ver
//      uploadContratoPdfAssinado em contratoPdfStorage.ts), confirmando que o PDF nao foi alterado.
// Renderizada pela rota /validar (ver integracao em AppRoot.tsx), pode receber ?sig=CODIGO na URL
// (preenchido automaticamente quando vem do QR Code do carimbo).

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Search, Upload, Loader2, Hash, Clock, User, FileCheck2 } from 'lucide-react';
import { supabase } from '../supabase';
import { maskCpfCnpj } from '../lib/contratoPdf';

interface ValidationResult {
  ok: boolean;
  parte?: 'contratante' | 'contratado';
  numero?: string;
  signerName?: string;
  cpfCnpjMasked?: string;
  signedAt?: string;
  documentHash?: string;
  method?: 'code' | 'pdf';
}

function getSigFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('sig') || '';
}

export default function ContractValidationPage() {
  const [code, setCode] = useState(getSigFromUrl());
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateByCode = async (rawCode: string) => {
    const sig = rawCode.trim().toUpperCase();
    if (!sig) {
      setError('Digite o código de verificação.');
      return;
    }
    setIsSearching(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: qError } = await supabase
        .from('contratos')
        .select('numero, customer_name, cpf_cnpj, signed_at, empresa_signed_at, document_hash, contratante_signature_id, contratado_signature_id')
        .or(`contratante_signature_id.eq.${sig},contratado_signature_id.eq.${sig}`)
        .maybeSingle();

      if (qError || !data) {
        setResult({ ok: false, method: 'code' });
        return;
      }

      const isContratante = data.contratante_signature_id === sig;
      setResult({
        ok: true,
        method: 'code',
        parte: isContratante ? 'contratante' : 'contratado',
        numero: data.numero,
        signerName: isContratante ? data.customer_name : undefined,
        cpfCnpjMasked: isContratante && data.cpf_cnpj ? maskCpfCnpj(data.cpf_cnpj) : undefined,
        signedAt: isContratante ? data.signed_at : data.empresa_signed_at,
        documentHash: data.document_hash,
      });
    } catch (err) {
      console.error('Erro ao validar código:', err);
      setError('Não foi possível validar agora. Tente novamente em instantes.');
    } finally {
      setIsSearching(false);
    }
  };

  const validateByPdf = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

      const { data, error: qError } = await supabase
        .from('contratos')
        .select('numero, customer_name, signed_at, document_hash')
        .eq('pdf_hash', hash)
        .maybeSingle();

      if (qError || !data) {
        setResult({ ok: false, method: 'pdf' });
        return;
      }

      setResult({
        ok: true,
        method: 'pdf',
        numero: data.numero,
        signerName: data.customer_name,
        signedAt: data.signed_at,
        documentHash: data.document_hash,
      });
    } catch (err) {
      console.error('Erro ao validar PDF:', err);
      setError('Não foi possível validar o arquivo agora. Tente novamente em instantes.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const sig = getSigFromUrl();
    if (sig) validateByCode(sig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold">Validação de Assinatura Eletrônica</h1>
          <p className="text-sm text-slate-400 mt-1">
            Confira a autenticidade de um documento assinado digitalmente neste sistema.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Hash className="w-3.5 h-3.5" /> Código de verificação
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono tracking-wide outline-none focus:border-blue-500"
            />
            <button
              onClick={() => validateByCode(code)}
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-lg px-4 flex items-center justify-center"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Upload className="w-3.5 h-3.5" /> Ou envie o arquivo PDF
          </label>
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-700 rounded-lg py-4 text-sm text-slate-400 cursor-pointer hover:border-blue-500 hover:text-blue-400 transition">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
            {isUploading ? 'Conferindo arquivo...' : 'Selecionar PDF'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => e.target.files?.[0] && validateByPdf(e.target.files[0])}
            />
          </label>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        {result && result.ok && (
          <div className="bg-emerald-950/30 border border-emerald-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
              <ShieldCheck className="w-5 h-5" /> Documento autêntico
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <p><span className="text-slate-500">Contrato:</span> {result.numero}</p>
              {result.signerName && (
                <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-500" /> {result.signerName}</p>
              )}
              {result.cpfCnpjMasked && <p><span className="text-slate-500">Documento:</span> {result.cpfCnpjMasked}</p>}
              <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> {fmtDate(result.signedAt)}</p>
              {result.documentHash && (
                <p className="break-all font-mono text-xs text-slate-500 pt-1">Hash SHA-256: {result.documentHash}</p>
              )}
            </div>
          </div>
        )}

        {result && !result.ok && (
          <div className="bg-red-950/30 border border-red-800 rounded-2xl p-5 flex items-center gap-2 text-red-300">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="text-sm">
              {result.method === 'pdf'
                ? 'Este arquivo não corresponde a nenhum documento assinado neste sistema, ou foi alterado após a assinatura.'
                : 'Código não encontrado. Confira se digitou corretamente.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
