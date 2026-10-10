import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { showMessageToast } from './notify';
import type { AppUser } from '../types';

// NOTIFICAÇÃO DE PAGAMENTO RECEBIDO POR LINK (tabela crm_payment_notifications -- SQL em
// supabase/create_crm_payment_notifications.sql). O servidor grava UMA linha por pagamento confirmado, depois de dar a
// baixa na nota. Aqui o CRM:
//   * toca o som de dinheiro UMA vez e mostra o aviso clicável (que abre a nota do pedido);
//   * guarda tudo no histórico do sino de pagamentos (visualizada = sai do contador, mas continua na lista);
//   * avisa o PDV (evento `rpro-pagamento-link-recebido`) para fechar o modal de pagamento daquela nota.
// NÃO usa crm_notifications nem leads.waiting_since: por isso NUNCA entra no lembrete de 5 em 5 minutos das mensagens.

export type PagamentoRecebido = {
  id: string;
  saleId: string;
  clienteNome: string;
  valorCentavos: number;
  totalCentavos: number | null;
  restanteCentavos: number;
  tipo: 'entrada' | 'pagamento';
  criadoEm: string;
  visualizadaEm: string | null;
};

export const EVENTO_PAGAMENTO_LINK = 'rpro-pagamento-link-recebido';

/**
 * Quais modais do PDV fecham quando o pagamento por link de `saleId` é confirmado: só os que estão abertos para ESSA nota
 * (modal de pagamento -- Quitar Débito / Salvar Alterações -- e modal de cobrança). Os valores dentro deles ficam velhos
 * com a baixa feita pelo servidor, e lançar de novo duplicaria o recebimento. Modal de outra nota nunca fecha.
 */
export function modaisParaFechar(
  saleId: string,
  aberto: { pagamentoAberto: boolean; pagamentoNotaIds: Array<string | null | undefined>; cobrancaNotaId?: string | null },
): { pagamento: boolean; cobranca: boolean } {
  if (!saleId) return { pagamento: false, cobranca: false };
  return {
    pagamento: aberto.pagamentoAberto && aberto.pagamentoNotaIds.some(id => !!id && id === saleId),
    cobranca: !!aberto.cobrancaNotaId && aberto.cobrancaNotaId === saleId,
  };
}

/** Quem vê: administrador ou quem tem acesso ao PDV (é a tela onde a nota abre). */
export const usuarioPodeVerPagamentos = (user?: AppUser | null): boolean => {
  if (!user) return false;
  if (user.isAdmin) return true;
  return Array.isArray(user.allowedTabs) ? user.allowedTabs.includes('pos') : true;
};

/** "R$ 1.000,00" (espaço comum, sem o espaço sem quebra que o Intl coloca). */
export const formatarReais = (centavos: number): string =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');

/** Mesmo formato do recibo ("Pedido #A1B2C3D4"): os 8 últimos caracteres do id da nota. */
export const numeroDoPedido = (saleId: string): string => `#${String(saleId).slice(-8).toUpperCase()}`;

/** Pagamento parcial = "Entrada de R$ X recebida"; quitou a nota = "Pagamento de R$ X recebido". */
export const tituloDoPagamento = (p: Pick<PagamentoRecebido, 'tipo' | 'valorCentavos'>): string =>
  p.tipo === 'entrada'
    ? `Entrada de ${formatarReais(p.valorCentavos)} recebida`
    : `Pagamento de ${formatarReais(p.valorCentavos)} recebido`;

const mapear = (row: any): PagamentoRecebido => ({
  id: String(row.id),
  saleId: String(row.sale_id),
  clienteNome: String(row.cliente_nome || '').trim() || 'Cliente',
  valorCentavos: Number(row.valor_centavos) || 0,
  totalCentavos: row.total_centavos == null ? null : Number(row.total_centavos),
  restanteCentavos: Number(row.restante_centavos) || 0,
  tipo: row.tipo === 'entrada' ? 'entrada' : 'pagamento',
  criadoEm: String(row.criado_em || new Date().toISOString()),
  visualizadaEm: row.visualizada_em ? String(row.visualizada_em) : null,
});

// ---------------------------------------------------------------------------------------------
// Som de dinheiro (o mesmo arquivo que o CRM já usa ao receber/quitar). Trava de 5 s: a baixa chega ao CRM por dois
// caminhos quase juntos (realtime da nota -> recibo aberto, e esta notificação) e o som não pode tocar duas vezes.
// ---------------------------------------------------------------------------------------------
const SOM_DINHEIRO = '/sounds/sale-complete.mp3';
const TRAVA_SOM_MS = 5000;
let ultimoSomEm = 0;

export function tocarSomDeDinheiro(): void {
  const agora = Date.now();
  if (agora - ultimoSomEm < TRAVA_SOM_MS) return;
  ultimoSomEm = agora;
  try {
    const audio = new Audio(SOM_DINHEIRO);
    audio.play().catch(() => { /* navegador bloqueou o áudio (precisa de 1 clique na página antes): segue sem som */ });
  } catch { /* navegador sem suporte a áudio */ }
}

// ---------------------------------------------------------------------------------------------
// Controle de "já avisei": cada notificação alarma UMA vez por navegador, mesmo se o Realtime reentregar o evento, a lista
// for relida ou a página for recarregada. Guardado no localStorage (só os ids mais recentes).
// ---------------------------------------------------------------------------------------------
const CHAVE_AVISADAS = 'rpro_pagamentos_avisados';
const MAX_AVISADAS = 200;
// Só alarma recebimento recente: o que chegou com o CRM fechado/suspenso aparece no sino (não visualizado), sem alarme atrasado.
const JANELA_ALARME_MS = 2 * 60 * 1000;
const JANELA_HISTORICO_DIAS = 7;

const lerAvisadas = (): string[] => {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_AVISADAS) || '[]');
    return Array.isArray(bruto) ? bruto.map(String) : [];
  } catch { return []; }
};
const gravarAvisadas = (ids: string[]) => {
  try { localStorage.setItem(CHAVE_AVISADAS, JSON.stringify(ids.slice(-MAX_AVISADAS))); } catch { /* ignora */ }
};

export function usePagamentosRecebidos(
  user: AppUser | null | undefined,
  companyId: string,
  abrirNota: (saleId: string) => void,
) {
  const [itens, setItens] = useState<PagamentoRecebido[]>([]);
  const userId = user?.id;
  const podeVer = usuarioPodeVerPagamentos(user);
  const abrirRef = useRef(abrirNota);
  abrirRef.current = abrirNota;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  // Ids já tratados nesta aba (evita reprocessar quando o Realtime reentrega o evento ou a lista é relida).
  const tratadas = useRef<Set<string>>(new Set());
  const itensRef = useRef<PagamentoRecebido[]>([]);
  itensRef.current = itens;

  const marcarVisualizadas = useCallback(async (ids?: string[]) => {
    const alvo = itensRef.current.filter(i => !i.visualizadaEm && (!ids || ids.includes(i.id))).map(i => i.id);
    if (alvo.length === 0) return;
    const agora = new Date().toISOString();
    setItens(prev => prev.map(i => (alvo.includes(i.id) ? { ...i, visualizadaEm: agora } : i)));
    const { error } = await supabase
      .from('crm_payment_notifications')
      .update({ visualizada_em: agora, visualizada_por: userIdRef.current ? String(userIdRef.current) : null })
      .in('id', alvo)
      .is('visualizada_em', null);
    if (error) console.warn('Não foi possível marcar a notificação de pagamento como vista:', error.message || error);
  }, []);

  const abrirPagamento = useCallback((p: PagamentoRecebido) => {
    void marcarVisualizadas([p.id]);
    abrirRef.current(p.saleId);
  }, [marcarVisualizadas]);

  // Tratamento único de cada pagamento confirmado:
  //  - toda aba avisa o PDV (evento) para fechar o modal de pagamento daquela nota;
  //  - o ALARME (som de dinheiro + aviso clicável) acontece uma só vez por navegador: o localStorage barra a 2ª aba, a
  //    recarga da página e a reentrega do evento. Nunca repete: não existe timer de lembrete para este tipo de aviso.
  const avisar = useCallback((p: PagamentoRecebido) => {
    if (tratadas.current.has(p.id)) return;
    tratadas.current.add(p.id);
    const recente = Date.now() - Date.parse(p.criadoEm) <= JANELA_ALARME_MS;
    if (recente) {
      try { window.dispatchEvent(new CustomEvent(EVENTO_PAGAMENTO_LINK, { detail: { saleId: p.saleId, id: p.id } })); } catch { /* ignora */ }
    }
    const jaAlarmou = lerAvisadas();
    if (jaAlarmou.includes(p.id)) return;
    gravarAvisadas([...jaAlarmou, p.id]);
    if (!recente) return; // chegou com o CRM fechado/suspenso: fica no sino como não visualizada, sem alarme atrasado
    tocarSomDeDinheiro();
    showMessageToast({
      key: `pagamento-${p.id}`,
      title: tituloDoPagamento(p),
      body: `Cliente: ${p.clienteNome}\nPedido: ${numeroDoPedido(p.saleId)}`,
      icon: 'pagamento',
      onClick: () => abrirPagamento(p),
    });
  }, [abrirPagamento]);

  const recarregar = useCallback(async () => {
    const desde = new Date(Date.now() - JANELA_HISTORICO_DIAS * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('crm_payment_notifications')
      .select('*')
      .eq('company_id', companyId)
      .gte('criado_em', desde)
      .order('criado_em', { ascending: false })
      .limit(50);
    if (error) return; // tabela ainda não criada / sem rede: não mostra nada e não quebra
    const lista = (data || []).map(mapear);
    setItens(lista);
    // Rede de segurança caso o Realtime tenha falhado: o que ainda não alarmou e é recente alarma agora (uma única vez).
    [...lista].reverse().forEach(avisar);
  }, [companyId, avisar]);

  useEffect(() => {
    if (!userId || !podeVer) { setItens([]); return; }
    void recarregar();
    const canal = supabase
      .channel(`pagamentos-recebidos-${companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_payment_notifications', filter: `company_id=eq.${companyId}` }, (payload: any) => {
        if (!payload?.new?.id) return;
        const p = mapear(payload.new);
        setItens(prev => (prev.some(i => i.id === p.id) ? prev : [p, ...prev].slice(0, 50)));
        avisar(p);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crm_payment_notifications', filter: `company_id=eq.${companyId}` }, (payload: any) => {
        if (!payload?.new?.id) return;
        const p = mapear(payload.new);
        setItens(prev => prev.map(i => (i.id === p.id ? p : i)));
      })
      .subscribe();
    const timer = setInterval(() => { void recarregar(); }, 60000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') void recarregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', aoVoltar);
    return () => {
      supabase.removeChannel(canal);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', aoVoltar);
    };
  }, [userId, podeVer, companyId, recarregar, avisar]);

  return { itens, abrirPagamento, marcarVisualizadas };
}
