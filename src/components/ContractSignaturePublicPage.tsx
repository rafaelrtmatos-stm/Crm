// Tela publica (sem login) onde o CLIENTE acessa o link recebido manualmente, le o contrato,
// digita o codigo OTP que o operador enviou por WhatsApp/E-mail, e assina.
// Renderizada pela rota /assinar/:contratoId (ver integração em AppRoot.tsx).

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, Download, Hash, Globe, Clock, IdCard, Copy, Clipboard } from 'lucide-react';
import { supabase } from '../supabase';
import { validateVerificationCode, signContract, checkDocumentLastDigits, createVerificationCode } from '../lib/otpUtils';
import { getPublicIpAddress } from '../lib/contractUtils';
import { downloadContratoPdf } from '../lib/contratoPdf';

interface ContratoPublico {
  id: string;
  numero: string;
  customerName: string;
  textoContrato: string;
  status: string;
}

// Extrai o id do contrato da URL /assinar/:id (mesmo padrao de deteccao de rota usado em AppRoot.tsx)
function getContratoIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/assinar\/([a-zA-Z0-9-]+)\/?$/);
  return match ? match[1] : null;
}

export default function ContractSignaturePublicPage() {
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState<ContratoPublico | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [agreed, setAgreed] = useState(false);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Checagem extra de identidade (3 ultimos digitos do CPF/CNPJ) -- precisa bater ANTES de
  // liberar os campos do codigo OTP recebido por WhatsApp. Ver checkDocumentLastDigits em otpUtils.ts.
  const [documentDigits, setDocumentDigits] = useState('');
  const [docVerified, setDocVerified] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [isCheckingDoc, setIsCheckingDoc] = useState(false);

  // Codigo gerado e exibido nesta mesma tela (sem envio por WhatsApp) -- ver contexto
  // acordado com o cliente: a checagem de CPF/CNPJ acima faz o papel de segunda camada.
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeGenError, setCodeGenError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [signedResult, setSignedResult] = useState<{ hash: string; ip: string; signedAt: string } | null>(null);

  useEffect(() => {
    const id = getContratoIdFromUrl();
    if (!id) { setNotFound(true); setLoading(false); return; }

    supabase
      .from('contratos')
      .select('id, numero, customer_name, texto_contrato, status')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) { setNotFound(true); setLoading(false); return; }
        setContrato({
          id: data.id,
          numero: data.numero,
          customerName: data.customer_name,
          textoContrato: data.texto_contrato || '',
          status: data.status,
        });
        setLoading(false);
      });
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...codeDigits];
    next[index] = value;
    setCodeDigits(next);
    setError(null);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyDocument = async () => {
    if (!contrato) return;
    if (documentDigits.length !== 3) {
      setDocError('Digite os 3 últimos números do seu CPF ou CNPJ.');
      return;
    }
    setIsCheckingDoc(true);
    setDocError(null);
    try {
      const match = await checkDocumentLastDigits(contrato.id, documentDigits);
      if (!match) {
        setDocError('Não confere com o documento cadastrado neste contrato. Confira e tente novamente.');
        setIsCheckingDoc(false);
        return;
      }
      setDocVerified(true);
    } catch (err) {
      console.error('Erro ao checar documento:', err);
      setDocError('Ocorreu um erro ao verificar. Tente novamente em instantes.');
    } finally {
      setIsCheckingDoc(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!contrato) return;
    if (!agreed) {
      setError('Você precisa marcar "Li e concordo com os termos" antes de assinar.');
      return;
    }
    setIsGeneratingCode(true);
    setCodeGenError(null);
    try {
      const result = await createVerificationCode(contrato.id);
      setGeneratedCode(result.code);
    } catch (err) {
      console.error('Erro ao gerar codigo:', err);
      setCodeGenError('Não foi possível gerar o código. Tente novamente.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar. Selecione o código manualmente.');
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length === 6) {
        setCodeDigits(digits);
        setError(null);
      } else {
        setError('Não encontrei um código de 6 dígitos na área de transferência. Copie o código acima e tente de novo.');
      }
    } catch {
      setError('Não foi possível colar automaticamente. Copie o código acima e digite nos campos manualmente.');
    }
  };

  const handleSubmit = async () => {
    if (!contrato) return;
    if (!docVerified) {
      setError('Confirme os últimos dígitos do seu CPF/CNPJ antes de assinar.');
      return;
    }
    if (!agreed) {
      setError('Você precisa marcar "Li e concordo com os termos" antes de assinar.');
      return;
    }
    const fullCode = codeDigits.join('');
    if (fullCode.length !== 6) {
      setError('Digite os 6 dígitos do código recebido.');
      return;
    }

    setIsValidating(true);
    setError(null);
    try {
      const validation = await validateVerificationCode(contrato.id, fullCode);
      if (!validation.ok) {
        setError(OTP_ERROR_MESSAGES[validation.reason]);
        setIsValidating(false);
        return;
      }

      const clientIp = await getPublicIpAddress();
      const clientUserAgent = navigator.userAgent;

      const result = await signContract({
        contractId: contrato.id,
        documentText: contrato.textoContrato,
        clientIp,
        clientUserAgent,
      });

      setSignedResult({ hash: result.documentHash, ip: clientIp, signedAt: result.signedAt });
    } catch (err: any) {
      console.error('Erro ao validar/assinar:', err);
      setError('Ocorreu um erro ao processar a assinatura. Tente novamente em instantes.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!contrato || !signedResult) return;
    downloadContratoPdf(contrato.numero, contrato.customerName, contrato.textoContrato, {
      signedAt: signedResult.signedAt,
      signerIp: signedResult.ip,
      documentHash: signedResult.hash,
    });
  };

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
        <p className="text-white font-bold">Link inválido ou contrato não encontrado</p>
        <p className="text-white/40 text-sm">Confira o link recebido ou entre em contato com quem enviou.</p>
      </div>
    );
  }

  if (contrato.status === 'assinado' && !signedResult) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <CheckCircle2 className="text-emerald-400" size={32} />
        <p className="text-white font-bold">Este contrato já foi assinado</p>
        <p className="text-white/40 text-sm">Nº {contrato.numero}</p>
      </div>
    );
  }

  if (signedResult) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <CheckCircle2 className="text-emerald-400" size={48} />
        <h1 className="text-white text-xl font-black">Assinatura confirmada!</h1>
        <p className="text-white/50 text-sm max-w-sm">
          Contrato {contrato.numero} assinado eletronicamente por {contrato.customerName}.
        </p>

        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-2 mt-2">
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Clock size={12} /> {new Date(signedResult.signedAt).toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Globe size={12} /> IP {signedResult.ip}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50 break-all">
            <Hash size={12} className="shrink-0" /> {signedResult.hash}
          </div>
        </div>

        <button
          onClick={handleDownloadPdf}
          className="mt-2 flex items-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-black text-xs font-black uppercase px-5 py-3 transition-colors"
        >
          <Download size={14} /> Baixar PDF Assinado
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-1">
          <ShieldCheck className="mx-auto text-primary-400" size={28} />
          <h1 className="text-white text-lg font-black">Assinatura Digital do Contrato</h1>
          <p className="text-white/40 text-xs">Nº {contrato.numero} — {contrato.customerName}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white max-h-72 overflow-y-auto p-4">
          <pre className="whitespace-pre-wrap text-[12px] text-black font-sans leading-relaxed">
            {contrato.textoContrato || 'Texto do contrato indisponível.'}
          </pre>
        </div>

        <label className="flex items-start gap-2 text-[12px] text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          Li e concordo com os termos do contrato de prestação de serviços acima.
        </label>

        {/* Etapa 1: checagem de identidade (3 ultimos digitos do CPF/CNPJ). So depois de
            confirmar aqui e' que o campo do codigo OTP (etapa 2) fica liberado. */}
        {!docVerified ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <p className="text-[11px] text-white/50 flex items-center gap-1.5">
              <IdCard size={13} className="shrink-0" />
              Pra continuar, confirme os 3 últimos números do seu CPF ou CNPJ:
            </p>
            <div className="flex justify-center">
              <input
                value={documentDigits}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                  setDocumentDigits(digits);
                  setDocError(null);
                }}
                maxLength={3}
                inputMode="numeric"
                placeholder="000"
                className="w-24 h-12 text-center text-lg font-black bg-black/40 border border-white/15 rounded-lg text-white focus:border-primary-400 outline-none tracking-widest"
              />
            </div>

            {docError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1.5 justify-center">
                <AlertCircle size={12} /> {docError}
              </p>
            )}

            <button
              onClick={handleVerifyDocument}
              disabled={isCheckingDoc}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-black uppercase py-3 transition-colors"
            >
              {isCheckingDoc ? <Loader2 size={14} className="animate-spin" /> : <IdCard size={14} />}
              Confirmar
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 flex items-center gap-2 text-[11px] text-emerald-400">
            <CheckCircle2 size={14} className="shrink-0" />
            Identidade confirmada.
          </div>
        )}

        {/* Etapa 2: gera e mostra o codigo nesta mesma tela (so aparece depois da etapa 1) */}
        {docVerified && !generatedCode && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            {codeGenError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1.5 justify-center">
                <AlertCircle size={12} /> {codeGenError}
              </p>
            )}
            <button
              onClick={handleGenerateCode}
              disabled={isGeneratingCode || !agreed}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-black text-xs font-black uppercase py-3 transition-colors"
            >
              {isGeneratingCode ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Assinar
            </button>
            {!agreed && (
              <p className="text-[10px] text-white/30 text-center">Marque "Li e concordo" acima primeiro.</p>
            )}
          </div>
        )}

        {/* Etapa 3: codigo gerado -- copiar, colar nos campos e confirmar */}
        {docVerified && generatedCode && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="rounded-xl bg-black/40 border border-white/10 p-4 text-center space-y-2">
            <p className="text-[10px] uppercase font-bold text-white/40">Seu código de assinatura</p>
            <p className="text-3xl font-black tracking-[0.3em] text-primary-400 select-all">{generatedCode}</p>
            <button
              onClick={handleCopyCode}
              className="mx-auto flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-[10px] font-bold px-3 py-1.5 transition-colors"
            >
              {codeCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {codeCopied ? 'Copiado!' : 'Copiar código'}
            </button>
            <p className="text-[10px] text-rose-400/80 font-bold flex items-center justify-center gap-1">
              <AlertCircle size={11} /> Não compartilhe esse código com ninguém.
            </p>
          </div>

          <p className="text-[11px] text-white/50 text-center">
            Cole o código abaixo pra confirmar:
          </p>
          <div className="flex justify-center gap-2">
            {codeDigits.map((digit, i) => (
              <input
                key={i}
                id={`otp-digit-${i}`}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                maxLength={1}
                inputMode="numeric"
                className="w-10 h-12 text-center text-lg font-black bg-black/40 border border-white/15 rounded-lg text-white focus:border-primary-400 outline-none"
              />
            ))}
          </div>

          <button
            onClick={handlePasteCode}
            className="mx-auto flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[10px] font-bold px-3 py-1.5 transition-colors"
          >
            <Clipboard size={12} /> Colar
          </button>

          {error && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1.5 justify-center">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isValidating}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-black text-xs font-black uppercase py-3 transition-colors"
          >
            {isValidating ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Assinar
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

const OTP_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Nenhum código ativo para este contrato. Peça um novo código a quem está te atendendo.',
  expired: 'Este código expirou. Peça um novo código a quem está te atendendo.',
  already_used: 'Este código já foi utilizado. Peça um novo código.',
  wrong_code: 'Código incorreto. Confira e tente novamente.',
  too_many_attempts: 'Muitas tentativas incorretas. Peça um novo código a quem está te atendendo.',
};
