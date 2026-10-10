import React, { useMemo, useState } from 'react';
import { Link2, MessageSquare, QrCode } from 'lucide-react';
import { Button, Input, Modal } from './SharedUI';
import { showAlert } from '../lib/notify';
import type { SaleOrder } from '../types';
import {
  PixConfigLite,
  OpcaoCobranca,
  criarLinkPagamento,
  enviarCobrancaPix,
  enviarLinkPagamento,
  fmtBRL,
  opcoesPadrao,
  telefoneParaEnvio,
} from '../lib/cobrancaPix';

// "Cobrar saldo via PIX": a partir de uma nota já salva, manda ao cliente (WhatsApp)
//  - MENSAGEM: QR Code (imagem) + PIX copia e cola, com o valor escolhido (50%, total ou outro); ou
//  - LINK: página pública /pagar/:token em que o próprio cliente escolhe entre as opções marcadas.

interface Props {
  order: SaleOrder;
  telefoneInicial?: string;
  pix: PixConfigLite;
  companyId: string;
  onClose: () => void;
}

export const EnviarCobrancaModal: React.FC<Props> = ({ order, telefoneInicial, pix, companyId, onClose }) => {
  const pago = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? order.total : 0);
  const restante = Math.max(0, Number((order.total - pago).toFixed(2)));
  const padrao = useMemo(() => opcoesPadrao(restante), [restante]);

  const [modo, setModo] = useState<'mensagem' | 'link'>('mensagem');
  const [escolha, setEscolha] = useState<string>(padrao[0]?.id || 'outro'); // modo mensagem: uma opção
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(padrao.map(o => o.id))); // modo link: várias
  const [outroValor, setOutroValor] = useState<string>('');
  const [telefone, setTelefone] = useState<string>(telefoneInicial || order.customerPhone || '');
  const [enviando, setEnviando] = useState(false);

  const valorOutroCent = (() => {
    const n = Number(String(outroValor).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  })();
  const outroValido = valorOutroCent > 0 && valorOutroCent <= Math.round(restante * 100);
  const outroOpcao: OpcaoCobranca = { id: 'outro', label: 'Outro valor', valor_centavos: valorOutroCent };

  const opcoesParaEnviar: OpcaoCobranca[] = modo === 'mensagem'
    ? (escolha === 'outro' ? (outroValido ? [outroOpcao] : []) : padrao.filter(o => o.id === escolha))
    : [...padrao.filter(o => marcadas.has(o.id)), ...(marcadas.has('outro') && outroValido ? [outroOpcao] : [])];

  const alternarMarcada = (id: string) => setMarcadas(prev => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    return novo;
  });

  const validar = (): boolean => {
    if (restante <= 0) { showAlert('Esta nota não tem saldo a cobrar.'); return false; }
    if (!telefoneParaEnvio(telefone)) { showAlert('Informe um WhatsApp válido (com DDD).'); return false; }
    if (opcoesParaEnviar.length === 0) { showAlert('Escolha um valor válido (não pode passar do saldo da nota).'); return false; }
    return true;
  };

  const enviarMensagem = async () => {
    if (enviando || !validar()) return;
    setEnviando(true);
    try {
      const r = await enviarCobrancaPix({
        phone: telefone,
        customerName: order.customerName,
        itens: order.items,
        orderId: order.id,
        valor: opcoesParaEnviar[0].valor_centavos / 100,
        pix,
      });
      if (!r.ok) { showAlert(`Não foi possível enviar a cobrança: ${r.erro || 'erro no envio'}`); return; }
      showAlert('Cobrança enviada no WhatsApp do cliente!');
      onClose();
    } finally {
      setEnviando(false);
    }
  };

  const gerarLink = async () => criarLinkPagamento({
    companyId,
    saleId: order.id,
    customerName: order.customerName,
    phone: telefone,
    itens: order.items,
    totalCentavos: Math.round(order.total * 100),
    restanteCentavos: Math.round(restante * 100),
    opcoes: opcoesParaEnviar,
    pix,
  });

  const enviarLink = async () => {
    if (enviando || !validar()) return;
    setEnviando(true);
    try {
      const link = await gerarLink();
      if (!link.ok || !link.url) { showAlert(`Não foi possível criar o link: ${link.erro || 'erro desconhecido'}`); return; }
      const r = await enviarLinkPagamento({ phone: telefone, customerName: order.customerName, itens: order.items, opcoes: opcoesParaEnviar, url: link.url });
      if (!r.ok) { showAlert(`Link criado, mas o envio falhou: ${r.erro || 'erro no envio'}`); return; }
      showAlert('Link de pagamento enviado no WhatsApp do cliente!');
      onClose();
    } finally {
      setEnviando(false);
    }
  };

  const copiarLink = async () => {
    if (enviando || opcoesParaEnviar.length === 0) { if (!enviando) showAlert('Escolha ao menos uma opção de valor.'); return; }
    setEnviando(true);
    try {
      const link = await gerarLink();
      if (!link.ok || !link.url) { showAlert(`Não foi possível criar o link: ${link.erro || 'erro desconhecido'}`); return; }
      try {
        await navigator.clipboard.writeText(link.url);
        showAlert('Link copiado!');
      } catch {
        showAlert(`Copie o link: ${link.url}`);
      }
    } finally {
      setEnviando(false);
    }
  };

  const chip = (ativo: boolean) =>
    'w-full text-left px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ' +
    (ativo ? 'bg-primary-500/20 text-primary-200 border-primary-500/50' : 'bg-white/[0.03] text-white/60 border-white/10 hover:bg-white/[0.08]');

  return (
    <Modal isOpen onClose={onClose} title="Cobrar saldo via PIX" size="sm" className="w-full max-w-[calc(100vw-24px)] sm:max-w-md mx-auto rounded-[22px] p-3 sm:p-4">
      <div className="space-y-3">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-white/50 block">Saldo a cobrar</span>
            <span className="text-xl font-black text-white font-mono">{fmtBRL(restante)}</span>
          </div>
          <span className="text-[10px] font-black text-white/40 uppercase">Nota #{order.id.slice(-6).toUpperCase()}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setModo('mensagem')} className={chip(modo === 'mensagem')}>
            <span className="flex items-center gap-1.5"><QrCode size={14} /> QR + copia e cola</span>
          </button>
          <button type="button" onClick={() => setModo('link')} className={chip(modo === 'link')}>
            <span className="flex items-center gap-1.5"><Link2 size={14} /> Link de pagamento</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-white/50 block">
            {modo === 'mensagem' ? 'Valor a cobrar' : 'Opções que o cliente poderá escolher'}
          </label>
          {padrao.map(o => {
            const ativo = modo === 'mensagem' ? escolha === o.id : marcadas.has(o.id);
            return (
              <button key={o.id} type="button" className={chip(ativo)} onClick={() => (modo === 'mensagem' ? setEscolha(o.id) : alternarMarcada(o.id))}>
                {modo === 'link' ? (ativo ? '☑ ' : '☐ ') : (ativo ? '◉ ' : '○ ')}{o.label} — {fmtBRL(o.valor_centavos / 100)}
              </button>
            );
          })}
          <button
            type="button"
            className={chip(modo === 'mensagem' ? escolha === 'outro' : marcadas.has('outro'))}
            onClick={() => (modo === 'mensagem' ? setEscolha('outro') : alternarMarcada('outro'))}
          >
            {modo === 'link' ? (marcadas.has('outro') ? '☑ ' : '☐ ') : (escolha === 'outro' ? '◉ ' : '○ ')}Outro valor
          </button>
          {(modo === 'mensagem' ? escolha === 'outro' : marcadas.has('outro')) && (
            <Input
              type="number"
              placeholder={`Até ${restante.toFixed(2)}`}
              value={outroValor}
              onChange={e => setOutroValor(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-white/50 block mb-1">WhatsApp do cliente</label>
          <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(93) 99999-9999" />
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/10">
          <button type="button" className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5" onClick={onClose}>
            Cancelar
          </button>
          {modo === 'link' && (
            <button
              type="button"
              disabled={enviando}
              onClick={copiarLink}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 disabled:opacity-50"
            >
              Copiar link
            </button>
          )}
          <button
            type="button"
            disabled={enviando}
            onClick={modo === 'mensagem' ? enviarMensagem : enviarLink}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/40 flex items-center gap-1.5 disabled:opacity-50"
          >
            <MessageSquare size={15} />
            <span>{enviando ? 'Enviando...' : (modo === 'mensagem' ? 'Enviar no WhatsApp' : 'Enviar link no WhatsApp')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
