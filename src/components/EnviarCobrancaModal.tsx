import React, { useMemo, useState } from 'react';
import { Link2, MessageSquare, QrCode } from 'lucide-react';
import { Button, Input, Modal } from './SharedUI';
import { showAlert } from '../lib/notify';
import { useApp } from '../AppContext';
import type { SaleOrder } from '../types';
import {
  PixConfigLite,
  OpcaoCobranca,
  criarLinkPagamento,
  prepararCobrancaPix,
  montarTextoLinkPagamento,
  fmtBRL,
  fmtValidade,
  opcoesPadrao,
  telefoneParaEnvio,
} from '../lib/cobrancaPix';
import { calcularDescontoPix, type ModoDescontoPix } from '../lib/descontoPix';

// "Cobrar saldo via PIX": a partir de uma nota já salva, prepara a cobrança para o cliente (WhatsApp)
//  - MENSAGEM: QR Code (imagem com legenda) na caixa de mensagem da conversa (sem envio automático); ao enviar, o PIX copia e cola
//    sai em uma 2a mensagem de texto e a verificação do pagamento é registrada em pix_pendentes; ou
//  - LINK: página pública /pagar/:token em que o próprio cliente escolhe entre as opções marcadas — o texto vai para a
//    CAIXA DE MENSAGEM da conversa (como recibo/orçamento), sem envio automático.

interface Props {
  order: SaleOrder;
  telefoneInicial?: string;
  pix: PixConfigLite;
  companyId: string;
  onClose: () => void;
  /** Chamado depois que link/QR foram colocados na caixa de mensagem (ex.: PDV fecha a nota aberta e limpa o retorno). */
  onConversaAberta?: () => void;
}

export const EnviarCobrancaModal: React.FC<Props> = ({ order, telefoneInicial, pix, companyId, onClose, onConversaAberta }) => {
  const { openWhatsAppChat, setPendingReceiptAttachment } = useApp();
  const pago = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? order.total : 0);
  const restante = Math.max(0, Number((order.total - pago).toFixed(2)));
  const padrao = useMemo(() => opcoesPadrao(restante), [restante]);

  const [modo, setModo] = useState<'mensagem' | 'link'>('mensagem');
  const [escolha, setEscolha] = useState<string>(padrao[0]?.id || 'outro'); // modo mensagem: uma opção
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(padrao.map(o => o.id))); // modo link: várias
  const [outroValor, setOutroValor] = useState<string>('');
  const [telefone, setTelefone] = useState<string>(telefoneInicial || order.customerPhone || '');
  const [enviando, setEnviando] = useState(false);
  // Validade (link e QR/copia e cola): atalhos em horas (padrão 72 h) ou data/hora exata.
  const [prazo, setPrazo] = useState<'24' | '48' | '72' | 'custom'>('72');
  const [prazoCustom, setPrazoCustom] = useState<string>(''); // valor do <input type="datetime-local">
  // Desconto no Pix (definido manualmente): só vale quando "Aplicar desconto" está ligado.
  const [aplicarDesconto, setAplicarDesconto] = useState(false);
  const [tipoDesconto, setTipoDesconto] = useState<ModoDescontoPix>('percentual');
  const [valorDesconto, setValorDesconto] = useState<string>('');

  const venceCustom = prazoCustom ? new Date(prazoCustom) : null;
  const venceCustomValido = !!venceCustom && !Number.isNaN(venceCustom.getTime()) && venceCustom.getTime() > Date.now() + 5 * 60 * 1000;
  const venceEm: Date | null = prazo === 'custom'
    ? (venceCustomValido ? venceCustom : null)
    : new Date(Date.now() + Number(prazo) * 60 * 60 * 1000);

  const valorOutroCent = (() => {
    const n = Number(String(outroValor).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  })();
  const outroValido = valorOutroCent > 0 && valorOutroCent <= Math.round(restante * 100);
  const outroOpcao: OpcaoCobranca = { id: 'outro', label: 'Valor parcial', valor_centavos: valorOutroCent };

  // Opções escolhidas ANTES do desconto (valor original de cada uma).
  const opcoesBase: OpcaoCobranca[] = modo === 'mensagem'
    ? (escolha === 'outro' ? (outroValido ? [outroOpcao] : []) : padrao.filter(o => o.id === escolha))
    : [...padrao.filter(o => marcadas.has(o.id)), ...(marcadas.has('outro') && outroValido ? [outroOpcao] : [])];

  // Desconto aplicado a cada opção: valor_centavos passa a ser o valor FINAL cobrado no Pix.
  const restanteCent = Math.round(restante * 100);
  const calculos = opcoesBase.map(o => ({
    opcao: o,
    calc: calcularDescontoPix({ valorCentavos: o.valor_centavos, restanteCentavos: restanteCent, aplicar: aplicarDesconto && o.valor_centavos === restanteCent, tipo: tipoDesconto, valor: valorDesconto }),
  }));
  const erroDesconto = calculos.find(c => !c.calc.ok)?.calc.erro
    || (aplicarDesconto && opcoesBase.length > 0 && !opcoesBase.some(o => o.valor_centavos === restanteCent) ? 'O desconto à vista só vale para o pagamento integral do saldo (escolha "Saldo total").' : null);
  const opcoesParaEnviar: OpcaoCobranca[] = erroDesconto ? [] : calculos.map(({ opcao, calc }) => (
    calc.descontoCentavos > 0
      ? {
        ...opcao,
        valor_centavos: calc.finalCentavos,
        valor_original_centavos: calc.originalCentavos,
        desconto_centavos: calc.descontoCentavos,
        // 'final' (valor final digitado) é gravado como desconto fixo equivalente; o desconto é aplicado UMA vez na baixa.
        desconto_tipo: tipoDesconto === 'final' ? 'fixo' as const : tipoDesconto,
        desconto_valor: tipoDesconto === 'final' ? calc.descontoCentavos / 100 : Number(String(valorDesconto).replace(',', '.')),
      }
      : opcao
  ));

  const alternarMarcada = (id: string) => setMarcadas(prev => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    return novo;
  });

  const validar = (): boolean => {
    if (restante <= 0) { showAlert('Esta nota não tem saldo a cobrar.'); return false; }
    if (!telefoneParaEnvio(telefone)) { showAlert('Informe um WhatsApp válido (com DDD).'); return false; }
    if (aplicarDesconto && erroDesconto) { showAlert(erroDesconto); return false; }
    if (opcoesParaEnviar.length === 0) { showAlert('Escolha um valor válido (não pode passar do saldo da nota).'); return false; }
    if (!venceEm) { showAlert('Escolha uma data e hora de validade futura para o link.'); return false; }
    return true;
  };

  // QR + copia e cola: gera a imagem e deixa imagem + legenda (descrição da cobrança) na CAIXA DE MENSAGEM da conversa.
  // Nada é enviado sozinho: quem manda é o usuário, clicando em enviar no chat.
  const enviarMensagem = async () => {
    if (enviando || !validar()) return;
    setEnviando(true);
    try {
      const r = await prepararCobrancaPix({
        customerName: order.customerName,
        itens: order.items,
        orderId: order.id,
        valor: opcoesParaEnviar[0].valor_centavos / 100, // valor FINAL (com desconto): o QR cobra exatamente isto
        valorOriginal: opcoesParaEnviar[0].valor_original_centavos != null ? opcoesParaEnviar[0].valor_original_centavos / 100 : undefined,
        desconto: opcoesParaEnviar[0].desconto_centavos != null ? opcoesParaEnviar[0].desconto_centavos / 100 : undefined,
        pix,
        expiraEm: venceEm ?? undefined,
      });
      if (r.ok === false) { showAlert(`Não foi possível preparar a cobrança: ${r.erro}`); return; }
      setPendingReceiptAttachment({ file: r.file, previewUrl: r.previewUrl, caption: r.legenda, phone: telefone, pixCobranca: { saleId: order.id, companyId, valorCentavos: r.valorCentavos, copiaECola: r.payload, expiraEm: (venceEm as Date).toISOString(), descontoCentavos: opcoesParaEnviar[0].desconto_centavos, descontoTipo: opcoesParaEnviar[0].desconto_tipo, descontoValor: opcoesParaEnviar[0].desconto_valor } });
      onClose();
      onConversaAberta?.();
      await openWhatsAppChat(telefone, order.customerName || 'Cliente', '');
      showAlert('O QR Code está na caixa de mensagem — revise e envie. O copia e cola sai em seguida, em outra mensagem.');
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
    expiraEmData: venceEm ?? undefined,
  });

  // Link de pagamento: cria o link e deixa o texto pronto na CAIXA DE MENSAGEM da conversa (igual recibo/orçamento).
  // Nada é enviado sozinho: quem manda é o usuário, clicando em enviar no chat.
  const enviarLink = async () => {
    if (enviando || !validar()) return;
    setEnviando(true);
    try {
      const link = await gerarLink();
      if (!link.ok || !link.url) { showAlert(`Não foi possível criar o link: ${link.erro || 'erro desconhecido'}`); return; }
      const texto = montarTextoLinkPagamento({ customerName: order.customerName, itens: order.items, opcoes: opcoesParaEnviar, url: link.url, expiraEm: link.expiraEm });
      onClose();
      onConversaAberta?.();
      await openWhatsAppChat(telefone, order.customerName || 'Cliente', texto);
      showAlert('Link criado! O texto está na caixa de mensagem da conversa — revise e envie.');
    } finally {
      setEnviando(false);
    }
  };

  const copiarLink = async () => {
    if (aplicarDesconto && erroDesconto) { showAlert(erroDesconto); return; }
    if (enviando || opcoesParaEnviar.length === 0) { if (!enviando) showAlert('Escolha ao menos uma opção de valor.'); return; }
    if (!venceEm) { showAlert('Escolha uma data e hora de validade futura para o link.'); return; }
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
    <Modal isOpen onClose={onClose} zIndex={70} title="Cobrar saldo via PIX" size="sm" className="w-full max-w-[calc(100vw-24px)] sm:max-w-md mx-auto rounded-[22px] p-3 sm:p-4">
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
            // Com desconto válido, a opção selecionável mostra o valor FINAL (o que o cliente paga), com o original ao lado.
            const calcOpcao = calculos.find(c => c.opcao.id === o.id)?.calc;
            const comDesc = aplicarDesconto && !!calcOpcao && calcOpcao.ok && calcOpcao.descontoCentavos > 0;
            return (
              <button key={o.id} type="button" className={chip(ativo)} onClick={() => (modo === 'mensagem' ? setEscolha(o.id) : alternarMarcada(o.id))}>
                {modo === 'link' ? (ativo ? '☑ ' : '☐ ') : (ativo ? '◉ ' : '○ ')}{o.label} — {fmtBRL((comDesc ? calcOpcao!.finalCentavos : o.valor_centavos) / 100)}
                {comDesc && <span className="ml-1 font-semibold text-white/40 line-through">{fmtBRL(o.valor_centavos / 100)}</span>}
              </button>
            );
          })}
          <button
            type="button"
            className={chip(modo === 'mensagem' ? escolha === 'outro' : marcadas.has('outro'))}
            onClick={() => (modo === 'mensagem' ? setEscolha('outro') : alternarMarcada('outro'))}
          >
            {modo === 'link' ? (marcadas.has('outro') ? '☑ ' : '☐ ') : (escolha === 'outro' ? '◉ ' : '○ ')}Valor parcial (outro valor)
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

        <div className="space-y-1.5">
          <button type="button" className={chip(aplicarDesconto)} onClick={() => setAplicarDesconto(v => !v)}>
            {aplicarDesconto ? '☑ ' : '☐ '}Desconto à vista no Pix (pagamento integral do saldo)
          </button>
          {aplicarDesconto && (
            <div className="grid grid-cols-[auto_1fr] gap-1.5 items-center">
              <div className="grid grid-cols-3 gap-1">
                <button type="button" className={chip(tipoDesconto === 'percentual')} onClick={() => { setTipoDesconto('percentual'); setValorDesconto(''); }}>%</button>
                <button type="button" className={chip(tipoDesconto === 'fixo')} onClick={() => { setTipoDesconto('fixo'); setValorDesconto(''); }}>R$ desc.</button>
                <button type="button" className={chip(tipoDesconto === 'final')} onClick={() => { setTipoDesconto('final'); setValorDesconto(''); }}>Valor final</button>
              </div>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder={tipoDesconto === 'percentual' ? 'Ex.: 5 (%)' : tipoDesconto === 'final' ? 'Valor final. Ex.: 900,00 (R$)' : 'Desconto. Ex.: 100,00 (R$)'}
                value={valorDesconto}
                onChange={e => setValorDesconto(e.target.value)}
              />
            </div>
          )}
          {/* Prévia antes de gerar: valor original, desconto e valor final de cada opção. */}
          {opcoesBase.length > 0 && (
            <div className="w-fit max-w-full rounded-xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 text-[11px] font-semibold">
              {calculos.map(({ opcao, calc }) => (
                <div key={opcao.id} className="px-3 py-2 space-y-0.5 min-w-[220px] max-w-full">
                  <div className="text-[10px] uppercase font-black text-white/40">{opcao.label}</div>
                  <div className="flex justify-between text-white/60"><span>Valor original</span><span className="font-mono">{fmtBRL(calc.originalCentavos / 100)}</span></div>
                  {aplicarDesconto && calc.descontoCentavos > 0 && (
                    <div className="flex justify-between text-amber-300"><span>Desconto</span><span className="font-mono">{`- ${fmtBRL(calc.descontoCentavos / 100)}`}</span></div>
                  )}
                  <div className="flex justify-between text-primary-200 font-black"><span>Valor final no Pix</span><span className="font-mono">{fmtBRL((calc.ok ? calc.finalCentavos : calc.originalCentavos) / 100)}</span></div>
                </div>
              ))}
            </div>
          )}
          {aplicarDesconto && erroDesconto && <p className="text-[11px] font-bold text-rose-300">{erroDesconto}</p>}
        </div>

        {(
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-white/50 block">{modo === 'link' ? 'Validade do link' : 'Validade do PIX (tempo de espera do pagamento)'}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['24', '48', '72'] as const).map(h => (
                <button key={h} type="button" className={chip(prazo === h)} onClick={() => setPrazo(h)}>{h} h</button>
              ))}
              <button type="button" className={chip(prazo === 'custom')} onClick={() => setPrazo('custom')}>Data/hora</button>
            </div>
            {prazo === 'custom' && (
              <Input type="datetime-local" value={prazoCustom} onChange={e => setPrazoCustom(e.target.value)} />
            )}
            <span className="text-[10px] font-semibold text-white/50 block">
              {venceEm ? `Válido até ${fmtValidade(venceEm)} — aparece para o cliente na mensagem${modo === 'link' ? ' e na página' : ''}; depois disso o pagamento não é mais confirmado automaticamente.` : 'Escolha uma data e hora futuras.'}
            </span>
          </div>
        )}

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
              disabled={enviando || (aplicarDesconto && !!erroDesconto)}
              onClick={copiarLink}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 disabled:opacity-50"
            >
              Copiar link
            </button>
          )}
          <button
            type="button"
            disabled={enviando || (aplicarDesconto && !!erroDesconto)}
            onClick={modo === 'mensagem' ? enviarMensagem : enviarLink}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/40 flex items-center gap-1.5 disabled:opacity-50"
          >
            <MessageSquare size={15} />
            <span>{enviando ? (modo === 'mensagem' ? 'Preparando...' : 'Criando link...') : (modo === 'mensagem' ? 'Colocar na conversa' : 'Colocar link na conversa')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
