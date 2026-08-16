// Painel Admin: mostra os dados TECNICOS de auditoria gravados no Supabase no momento em
// que o cliente assinou o contrato via token OTP (IP, data/hora exata, hash SHA-256 do
// documento e o telefone/e-mail para onde o token foi enviado).
//
// Uso: <ContractAcceptanceDetailsModal contrato={c} onClose={() => ...} />

import React from 'react';
import { Copy, Fingerprint, Clock, Smartphone, Globe, X, ShieldCheck, User, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from './SharedUI';
import { showAlert } from '../lib/notify';
import { supabase } from '../supabase';
import type { Contrato } from '../types';

// Formata uma data com fallback seguro — mesma lógica usada em Modules.tsx — evita
// "RangeError: Invalid time value" quando o dado vem malformado/vazio.
function safeFormat(value: any, fmt: string, fallback: string = ''): string {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : format(d, fmt);
}

const SIGNATURE_METHOD_LABELS: Record<string, string> = {
  otp_manual_whatsapp: 'Token (OTP) enviado manualmente via WhatsApp',
};

const CONTRATO_STATUS_LABELS_MODAL: Record<string, string> = {
  rascunho: 'Rascunho', aguardando_aceite: 'Aguardando Aceite', aceito: 'Aceito',
  assinado: 'Assinado Digitalmente',
  em_execucao: 'Em Execução', concluido: 'Concluído', cancelado: 'Cancelado', encerrado: 'Encerrado',
};

interface ContractAcceptanceDetailsModalProps {
  contrato: Contrato;
  onClose: () => void;
}

const CampoAuditoria = ({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}) => {
  const preenchido = !!value;
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] uppercase font-black tracking-widest text-white/40 flex items-center gap-1.5">
          {icon} {label}
        </p>
        {preenchido && (
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value as string);
                showAlert(`${label} copiado.`);
              } catch {
                showAlert('Não foi possível copiar.');
              }
            }}
            className="text-white/30 hover:text-white/70 transition-colors shrink-0"
            title={`Copiar ${label}`}
          >
            <Copy size={12} />
          </button>
        )}
      </div>
      <p className={`text-[12px] text-white/85 break-all ${mono ? 'font-mono' : ''}`}>
        {preenchido ? value : 'Não registrado'}
      </p>
    </div>
  );
};

export const ContractAcceptanceDetailsModal = ({ contrato, onClose }: ContractAcceptanceDetailsModalProps) => {
  const assinado = contrato.status === 'assinado';

  // Busca o Nome Completo e CPF/CNPJ atuais do cliente direto no banco (tabela clientes),
  // em vez de usar so o que foi digitado/copiado pro contrato na hora da criacao — assim a
  // identificacao do signatario reflete o cadastro real, mesmo que tenha sido atualizado depois.
  const [signatario, setSignatario] = React.useState<{ full_name: string; cpf_cnpj: string | null } | null>(null);
  const [isLoadingSignatario, setIsLoadingSignatario] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!contrato.clienteId) { setSignatario(null); return; }
    setIsLoadingSignatario(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('clientes')
          .select('full_name, cpf_cnpj')
          .eq('id', contrato.clienteId)
          .maybeSingle();
        if (cancelled) return;
        setSignatario(data ? { full_name: data.full_name, cpf_cnpj: data.cpf_cnpj } : null);
      } finally {
        if (!cancelled) setIsLoadingSignatario(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contrato.clienteId]);

  // Fallback pro que foi salvo no proprio contrato, caso o cliente nao esteja (mais)
  // vinculado por id ou a busca no banco falhe.
  const nomeSignatario = signatario?.full_name || contrato.customerName || '—';
  const cpfCnpjSignatario = signatario?.cpf_cnpj || contrato.cpfCnpj || null;

  const handleCopiarTudo = async () => {
    const linhas = [
      `Status: ${assinado ? 'Assinatura digital validada' : 'Ainda não assinado digitalmente'} (${CONTRATO_STATUS_LABELS_MODAL[contrato.status] || contrato.status})`,
      `Contrato: ${contrato.numero}${contrato.versao > 1 ? ` · v${contrato.versao}` : ''}`,
      `Signatário: ${nomeSignatario}${cpfCnpjSignatario ? ` (CPF/CNPJ: ${cpfCnpjSignatario})` : ''}`,
      `Data/Hora do aceite: ${safeFormat(contrato.signedAt, "dd/MM/yyyy 'às' HH:mm:ss", 'Não registrado')}`,
      `IP: ${contrato.signerIp || 'Não registrado'}`,
      `Telefone/E-mail: ${contrato.phone || 'Não registrado'}`,
      `Método: ${contrato.signatureMethod ? (SIGNATURE_METHOD_LABELS[contrato.signatureMethod] || contrato.signatureMethod) : 'Não registrado'}`,
      `Hash SHA-256: ${contrato.documentHash || 'Não registrado'}`,
      `User Agent: ${contrato.signerUserAgent || 'Não registrado'}`,
    ];
    try {
      await navigator.clipboard.writeText(linhas.join('\n'));
      showAlert('Todos os dados de auditoria foram copiados.');
    } catch {
      showAlert('Não foi possível copiar.');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Ver Detalhes do Aceite" size="md">
      <div className="space-y-4 p-1">
        {/* Identificação do signatário — nome e CPF/CNPJ puxados ao vivo do cadastro do cliente */}
        <div className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4 flex items-center gap-3">
          <User size={22} className="text-primary-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-black tracking-widest text-primary-300/70">Signatário</p>
            {isLoadingSignatario ? (
              <p className="text-sm text-white/40">Carregando dados do cliente…</p>
            ) : (
              <>
                <p className="text-sm font-bold text-white truncate">{nomeSignatario}</p>
                <p className="text-[11px] text-white/50 font-mono">{cpfCnpjSignatario || 'CPF/CNPJ não cadastrado'}</p>
              </>
            )}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${assinado ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
          {assinado ? (
            <ShieldCheck size={22} className="text-emerald-400 shrink-0" />
          ) : (
            <X size={22} className="text-amber-400 shrink-0" />
          )}
          <div>
            <p className={`text-sm font-bold ${assinado ? 'text-emerald-400' : 'text-amber-400'}`}>
              {assinado ? 'Assinatura digital validada' : 'Este contrato ainda não foi assinado digitalmente'}
            </p>
            <p className="text-[11px] text-white/50">
              Contrato {contrato.numero}{contrato.versao > 1 ? ` · v${contrato.versao}` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <CampoAuditoria
            icon={<Clock size={11} />}
            label="Data/hora exata do aceite"
            value={safeFormat(contrato.signedAt, "dd/MM/yyyy 'às' HH:mm:ss")}
          />
          <CampoAuditoria
            icon={<Globe size={11} />}
            label="IP do cliente no momento da assinatura"
            value={contrato.signerIp}
            mono
          />
          <CampoAuditoria
            icon={<Smartphone size={11} />}
            label="Telefone/e-mail para onde o token foi enviado"
            value={contrato.phone}
          />
          <CampoAuditoria
            icon={<ShieldCheck size={11} />}
            label="Método de assinatura"
            value={contrato.signatureMethod ? (SIGNATURE_METHOD_LABELS[contrato.signatureMethod] || contrato.signatureMethod) : undefined}
          />
        </div>

        <CampoAuditoria
          icon={<Fingerprint size={11} />}
          label="Hash SHA-256 do documento assinado"
          value={contrato.documentHash}
          mono
        />

        {contrato.signerUserAgent && (
          <CampoAuditoria
            icon={<Smartphone size={11} />}
            label="Dispositivo/navegador do cliente (user agent)"
            value={contrato.signerUserAgent}
            mono
          />
        )}

        <p className="text-[10px] text-white/30 leading-relaxed">
          Esses dados são gravados automaticamente no banco de dados no exato momento em que o
          cliente valida o token e aceita o contrato na tela pública de assinatura, e servem como
          prova técnica de autenticidade caso o aceite seja contestado.
        </p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={handleCopiarTudo}
            className="flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 rounded-xl px-4 py-2.5 transition-colors"
          >
            <ClipboardList size={14} /> Copiar Tudo
          </button>
          <button
            onClick={onClose}
            className="text-xs font-bold text-white/50 hover:text-white/80 px-4 py-2 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
