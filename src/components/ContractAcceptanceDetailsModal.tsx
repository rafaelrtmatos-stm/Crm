// Painel Admin: mostra os dados TECNICOS de auditoria gravados no Supabase no momento em
// que o cliente assinou o contrato via token OTP -- em duas "caixas de provas" separadas:
// o lado do cliente (quem assinou) e o lado da empresa (nós, validação interna do ERP).
//
// Uso: <ContractAcceptanceDetailsModal contrato={c} onClose={() => ...} />

import React from 'react';
import { Copy, Fingerprint, Clock, Smartphone, Globe, X, ShieldCheck, User, ClipboardList, Building2, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from './SharedUI';
import { showAlert } from '../lib/notify';
import { supabase } from '../supabase';
import { parseDeviceLabel } from '../lib/contractUtils';
import { OFFICIAL_COMPANY, PUBLIC_SIGN_ORIGIN, getContractSignatureLink } from '../lib/companyIdentity';
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

// Cabeçalho de cada "caixa de provas" (Lado do Cliente / Lado da Empresa)
const LadoHeader = ({ icon, titulo, subtitulo }: { icon: React.ReactNode; titulo: string; subtitulo: string }) => (
  <div className="flex items-center gap-2 pt-1">
    {icon}
    <div>
      <p className="text-xs font-black text-white uppercase tracking-wide">{titulo}</p>
      <p className="text-[10px] text-white/40">{subtitulo}</p>
    </div>
  </div>
);

export const ContractAcceptanceDetailsModal = ({ contrato, onClose }: ContractAcceptanceDetailsModalProps) => {
  const assinado = contrato.status === 'assinado';
  const signatureLink = getContractSignatureLink(contrato.id);

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

  // IP "de sistema" da empresa = o IP de onde o OPERADOR gerou o token OTP enviado ao cliente
  // (ja registrado em verification_codes.ip_address desde a criacao do codigo) -- e' o dado real
  // mais proximo de "nosso lado" que o sistema registra, sem inventar nada que nao foi capturado.
  const [companyIp, setCompanyIp] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!assinado) { setCompanyIp(null); return; }
    (async () => {
      const { data } = await supabase
        .from('verification_codes')
        .select('ip_address')
        .eq('contract_id', contrato.id)
        .eq('is_used', true)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setCompanyIp(data?.ip_address || null);
    })();
    return () => { cancelled = true; };
  }, [contrato.id, assinado]);

  // Fallback pro que foi salvo no proprio contrato, caso o cliente nao esteja (mais)
  // vinculado por id ou a busca no banco falhe.
  const nomeSignatario = signatario?.full_name || contrato.customerName || '—';
  const cpfCnpjSignatario = signatario?.cpf_cnpj || contrato.cpfCnpj || null;
  const deviceLabel = parseDeviceLabel(contrato.signerUserAgent);

  const handleCopiarTudo = async () => {
    const linhas = [
      `Status: ${assinado ? 'Assinatura digital validada' : 'Ainda não assinado digitalmente'} (${CONTRATO_STATUS_LABELS_MODAL[contrato.status] || contrato.status})`,
      `Contrato: ${contrato.numero}${contrato.versao > 1 ? ` · v${contrato.versao}` : ''}`,
      '',
      '— LADO DO CLIENTE —',
      `Signatário: ${nomeSignatario}${cpfCnpjSignatario ? ` (CPF/CNPJ: ${cpfCnpjSignatario})` : ''}`,
      `Contato: ${contrato.phone || 'Não registrado'}`,
      `Link exclusivo de assinatura: ${signatureLink}`,
      `Data/Hora do aceite: ${safeFormat(contrato.signedAt, "dd/MM/yyyy 'às' HH:mm:ss", 'Não registrado')}`,
      `IP: ${contrato.signerIp || 'Não registrado'}`,
      `Dispositivo: ${deviceLabel || 'Não identificado'}`,
      `Método: ${contrato.signatureMethod ? (SIGNATURE_METHOD_LABELS[contrato.signatureMethod] || contrato.signatureMethod) : 'Não registrado'}`,
      `User Agent: ${contrato.signerUserAgent || 'Não registrado'}`,
      '',
      '— LADO DA EMPRESA —',
      `Razão Social: ${OFFICIAL_COMPANY.razaoSocial}`,
      `Nome Fantasia: ${OFFICIAL_COMPANY.nomeFantasia}`,
      `CNPJ: ${OFFICIAL_COMPANY.cnpj}`,
      `Validado internamente pelo ERP em: ${safeFormat(contrato.signedAt, "dd/MM/yyyy 'às' HH:mm:ss", 'Não registrado')}`,
      `Nosso IP de sistema: ${companyIp || 'Não registrado'}`,
      `Origem: ${PUBLIC_SIGN_ORIGIN}`,
      '',
      `Hash SHA-256 (mesmo documento, ambos os lados): ${contrato.documentHash || 'Não registrado'}`,
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

        {/* ===================== LADO DO CLIENTE ===================== */}
        <LadoHeader
          icon={<User size={16} className="text-primary-400" />}
          titulo="Lado do Cliente"
          subtitulo="Quem assinou"
        />

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <CampoAuditoria
            icon={<Smartphone size={11} />}
            label="Contato (telefone)"
            value={contrato.phone}
          />
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
            label="Modelo do celular / dispositivo"
            value={deviceLabel}
          />
        </div>

        <CampoAuditoria
          icon={<Link2 size={11} />}
          label="Link exclusivo criado para este cliente assinar"
          value={signatureLink}
          mono
        />

        <CampoAuditoria
          icon={<ShieldCheck size={11} />}
          label="Código de segurança (Token OTP)"
          value={
            contrato.signatureMethod
              ? `Validado — ${SIGNATURE_METHOD_LABELS[contrato.signatureMethod] || contrato.signatureMethod} (o código em si não fica salvo em texto puro, por segurança)`
              : undefined
          }
        />

        {contrato.signerUserAgent && (
          <CampoAuditoria
            icon={<Smartphone size={11} />}
            label="User agent completo do dispositivo do cliente"
            value={contrato.signerUserAgent}
            mono
          />
        )}

        {/* ===================== LADO DA EMPRESA ===================== */}
        <LadoHeader
          icon={<Building2 size={16} className="text-white/60" />}
          titulo="Lado da Empresa"
          subtitulo="Nós"
        />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3">
          <Building2 size={22} className="text-white/50 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-black tracking-widest text-white/40">Razão Social / Nome Fantasia</p>
            <p className="text-sm font-bold text-white truncate">{OFFICIAL_COMPANY.razaoSocial}</p>
            <p className="text-[11px] text-white/50">{OFFICIAL_COMPANY.nomeFantasia} · CNPJ {OFFICIAL_COMPANY.cnpj}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <CampoAuditoria
            icon={<Clock size={11} />}
            label="Validado internamente no ERP em"
            value={safeFormat(contrato.signedAt, "dd/MM/yyyy 'às' HH:mm:ss")}
          />
          <CampoAuditoria
            icon={<Globe size={11} />}
            label="Nosso IP de sistema"
            value={companyIp}
            mono
          />
        </div>

        <CampoAuditoria
          icon={<Globe size={11} />}
          label="Origem"
          value={PUBLIC_SIGN_ORIGIN}
          mono
        />

        <CampoAuditoria
          icon={<Fingerprint size={11} />}
          label="Hash SHA-256 do documento (mesmo hash dos dois lados)"
          value={contrato.documentHash}
          mono
        />

        <p className="text-[10px] text-white/30 leading-relaxed">
          Esses dados são gravados automaticamente no banco de dados no exato momento em que o
          cliente valida o token e aceita o contrato na tela pública de assinatura, e servem como
          prova técnica de autenticidade caso o aceite seja contestado. O hash SHA-256 é o mesmo
          nos dois lados — é o que garante que o documento assinado pelo cliente é exatamente o
          mesmo validado internamente pelo ERP.
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
