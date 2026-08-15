// Painel Admin: gera o token OTP de assinatura e exibe em destaque para o operador
// copiar e enviar MANUALMENTE (WhatsApp/E-mail). Nada aqui dispara envio automatico.
//
// Uso: <ContractSignatureOtpPanel contrato={viewingContrato} onStatusChange={...} />
// Encaixa dentro do modal de visualizacao de contrato ja existente em Modules.tsx.

import React, { useState } from 'react';
import { Copy, RefreshCw, MessageCircle, ShieldCheck, Clock } from 'lucide-react';
import { showAlert } from '../lib/notify';
import { createVerificationCode } from '../lib/otpUtils';
import { getPublicIpAddress } from '../lib/contractUtils';
import type { Contrato } from '../types';

// Ajuste para o dominio real onde o CRM esta publicado (Vercel)
const PUBLIC_BASE_URL = 'https://pro.rafaartsgraphics.com.br';

interface ContractSignatureOtpPanelProps {
  contrato: Contrato;
}

export const ContractSignatureOtpPanel = ({ contrato }: ContractSignatureOtpPanelProps) => {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const signatureLink = `${PUBLIC_BASE_URL}/assinar/${contrato.id}`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const operatorIp = await getPublicIpAddress();
      const result = await createVerificationCode(contrato.id, operatorIp);
      setCode(result.code);
      setExpiresAt(result.expiresAt);
    } catch (err: any) {
      console.error('Erro ao gerar codigo OTP:', err);
      showAlert(`Não foi possível gerar o código: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showAlert(`${label} copiado.`);
    } catch {
      showAlert('Não foi possível copiar. Copie manualmente.');
    }
  };

  const whatsappMessage = code
    ? `Olá, ${contrato.customerName}! Segue o link para assinatura digital do seu contrato ${contrato.numero}:\n${signatureLink}\n\nSeu código de confirmação é: ${code}\n\nO código expira em ${CODE_TTL_LABEL}.`
    : '';

  const whatsappHref = contrato.phone
    ? `https://wa.me/55${contrato.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  if (contrato.status === 'assinado') {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
        <ShieldCheck size={22} className="text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-400">Contrato já assinado digitalmente</p>
          <p className="text-[11px] text-white/50">Veja os dados de auditoria (IP, hash, data/hora) no PDF gerado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-primary-400" />
        <p className="text-sm font-bold text-white">Assinatura Digital (Token Manual)</p>
      </div>

      {!code ? (
        <>
          <p className="text-[11px] text-white/50 leading-relaxed">
            Gere um código de confirmação para este contrato. O código aparece aqui na tela —
            copie o link e o código e envie você mesmo por WhatsApp ou e-mail para o cliente.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-black text-xs font-black uppercase py-2.5 transition-colors"
          >
            {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Gerar Código de Assinatura
          </button>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-black/40 border border-white/10 p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Código para enviar ao cliente</p>
            <p className="text-3xl font-black tracking-[0.3em] text-primary-400 select-all">{code}</p>
            {expiresAt && (
              <p className="text-[10px] text-white/40 flex items-center justify-center gap-1 mt-1">
                <Clock size={10} /> Válido até {new Date(expiresAt).toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={signatureLink}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/70 truncate"
              />
              <button
                onClick={() => copyToClipboard(signatureLink, 'Link')}
                className="shrink-0 rounded-lg bg-white/10 hover:bg-white/20 p-2 transition-colors"
                title="Copiar link"
              >
                <Copy size={14} className="text-white/70" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(whatsappMessage, 'Mensagem')}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold py-2 transition-colors"
              >
                <Copy size={12} /> Copiar Mensagem
              </button>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[11px] font-bold py-2 transition-colors"
              >
                <MessageCircle size={12} /> Abrir no WhatsApp
              </a>
            </div>
            <button
              onClick={() => copyToClipboard(code, 'Código')}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[10px] font-bold py-1.5 transition-colors"
            >
              <Copy size={11} /> Copiar só o código
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 text-[11px] text-white/40 hover:text-white/70 py-1.5 transition-colors"
          >
            <RefreshCw size={11} className={isGenerating ? 'animate-spin' : ''} /> Gerar novo código (invalida o atual)
          </button>
        </>
      )}
    </div>
  );
};

const CODE_TTL_LABEL = '30 minutos';
