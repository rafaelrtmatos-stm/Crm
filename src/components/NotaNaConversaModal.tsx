import React, { useEffect, useState } from 'react';
import { ExternalLink, QrCode } from 'lucide-react';
import { Modal } from './SharedUI';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { EnviarCobrancaModal } from './EnviarCobrancaModal';
import { PixConfigLite, fmtBRL } from '../lib/cobrancaPix';
import type { SaleOrder, Orcamento } from '../types';

// Nota / orçamento em uma janela POR CIMA da conversa: o usuário vê os dados e cobra via PIX sem sair do chat.
// "Abrir no PDV" é o único caminho que troca de aba (ver onAbrirNoPdv).
// TODO: "Enviar Recibo" (imagem do recibo) ainda só existe dentro do PDV — extrair a geração do recibo antes de trazer para cá.

interface Props {
  tipo: 'venda' | 'orcamento';
  id: string;
  companyId: string;
  mapVendaRow: (row: any) => SaleOrder;
  mapOrcamentoRow: (row: any) => Orcamento;
  onClose: () => void;
  onAbrirNoPdv: () => void;
}

export const NotaNaConversaModal: React.FC<Props> = ({ tipo, id, companyId, mapVendaRow, mapOrcamentoRow, onClose, onAbrirNoPdv }) => {
  const [venda, setVenda] = useState<SaleOrder | null>(null);
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pix, setPix] = useState<PixConfigLite | null>(null);
  const [cobrando, setCobrando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const tabela = tipo === 'venda' ? 'vendas' : 'orcamentos';
        const { data, error } = await supabase.from(tabela).select('*').eq('id', id).maybeSingle();
        if (!vivo) return;
        if (error || !data) { showAlert('Não foi possível abrir esse documento.'); onClose(); return; }
        if (tipo === 'venda') setVenda(mapVendaRow(data)); else setOrc(mapOrcamentoRow(data));
        if (tipo === 'venda') {
          const { data: cfg } = await supabase.from('configuracoes').select('*').eq('company_id', 'rafa-arts').maybeSingle();
          if (vivo && cfg?.pix_key) {
            setPix({
              key: cfg.pix_key,
              keyType: cfg.pix_key_type || undefined,
              beneficiaryName: cfg.beneficiary_name || 'RAFA ARTS GRAPHICS',
              city: cfg.city || 'Santarem',
              bank: cfg.pix_bank || '',
            });
          }
        }
      } catch (e) {
        console.warn('Falha ao carregar documento na conversa:', e);
        if (vivo) { showAlert('Não foi possível abrir esse documento.'); onClose(); }
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [tipo, id]);

  const itens = (venda?.items || orc?.items || []) as Array<{ name: string; price: number; quantity: number }>;
  const total = venda?.total ?? orc?.total ?? 0;
  const pago = venda ? (venda.downPayment ?? venda.receivedValue ?? (venda.status === 'completed' ? venda.total : 0)) : 0;
  const saldo = Math.max(0, Number((total - pago).toFixed(2)));
  const titulo = tipo === 'venda' ? `Nota #${id.slice(-6).toUpperCase()}` : `Orçamento ${orc?.numero || ''}`.trim();

  return (
    <>
      <Modal isOpen onClose={onClose} zIndex={60} title={titulo} size="sm" className="max-w-md mx-auto rounded-2xl p-3 sm:p-4">
        {carregando ? (
          <p className="text-xs text-white/60 p-4 text-center">Carregando…</p>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-white/70 font-semibold">{venda?.customerName || orc?.customerName || 'Cliente'}</div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {itens.map((i, k) => (
                <div key={k} className="flex justify-between gap-2 text-xs text-white/80 bg-white/[0.03] rounded-lg px-3 py-2">
                  <span>{i.quantity}x {i.name}</span>
                  <span className="font-mono">{fmtBRL((Number(i.price) || 0) * (Number(i.quantity) || 1))}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1 text-xs">
              <div className="flex justify-between text-white/70"><span>Total</span><span className="font-mono">{fmtBRL(total)}</span></div>
              {tipo === 'venda' && (
                <>
                  <div className="flex justify-between text-white/70"><span>Pago</span><span className="font-mono">{fmtBRL(pago)}</span></div>
                  <div className="flex justify-between font-black text-white"><span>Saldo</span><span className="font-mono">{fmtBRL(saldo)}</span></div>
                </>
              )}
              {tipo === 'orcamento' && orc?.status && (
                <div className="flex justify-between text-white/70"><span>Status</span><span>{String(orc.status)}</span></div>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/10">
              <button type="button" onClick={onAbrirNoPdv} className="px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-1.5">
                <ExternalLink size={14} /> Abrir no PDV
              </button>
              {tipo === 'venda' && saldo > 0 && (
                <button
                  type="button"
                  onClick={() => (pix ? setCobrando(true) : showAlert('Chave Pix não configurada. Configure em Configurações.'))}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/40 flex items-center gap-1.5"
                >
                  <QrCode size={15} /> Cobrar PIX
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
      {cobrando && venda && pix && (
        <EnviarCobrancaModal
          order={venda}
          telefoneInicial={venda.customerPhone}
          pix={pix}
          companyId={companyId}
          onClose={() => setCobrando(false)}
          onConversaAberta={onClose}
        />
      )}
    </>
  );
};
