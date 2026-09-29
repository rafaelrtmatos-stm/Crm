import { supabase } from '../supabase';

export interface QuickReply {
  id: string;
  title: string;
  shortcut?: string; // ex: /pix, /ola, /pronto
  text: string;
  imageUrl?: string;
  order?: number;
  companyId?: string;
  createdAt: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_KEY = 'rpro_whatsapp_quick_replies_v1';
const COMPANY_ID = 'rafa-arts';

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: 'qr-1',
    title: '👋 Boas-vindas',
    shortcut: '/ola',
    text: 'Olá! Seja muito bem-vindo(a) à Rafa Arts Graphics! 🎨✨ Como podemos te ajudar hoje?',
    order: 0,
    companyId: COMPANY_ID,
    createdAt: new Date().toISOString()
  },
  {
    id: 'qr-2',
    title: '💰 Orçamento PIX (Entrada 50%)',
    shortcut: '/pix',
    text: 'Segue o resumo do seu orçamento. Para darmos início imediato à produção, solicitamos uma entrada de 50% via PIX. Chave PIX: 93992112108 (Rafa Arts).',
    order: 1,
    companyId: COMPANY_ID,
    createdAt: new Date().toISOString()
  },
  {
    id: 'qr-3',
    title: '✅ Pagamento Confirmado',
    shortcut: '/pago',
    text: 'Confirmamos o recebimento do seu pagamento! 🚀 Seu pedido já foi encaminhado para a fila de produção.',
    order: 2,
    companyId: COMPANY_ID,
    createdAt: new Date().toISOString()
  },
  {
    id: 'qr-4',
    title: '📦 Pedido Pronto para Retirada',
    shortcut: '/pronto',
    text: 'Notícia boa! Seu pedido ficou pronto com acabamento de alta qualidade e já está disponível para retirada em nossa loja. 📦✨',
    order: 3,
    companyId: COMPANY_ID,
    createdAt: new Date().toISOString()
  },
  {
    id: 'qr-5',
    title: '📅 Agendamento de Entrega',
    shortcut: '/entrega',
    text: 'Confirmando o agendamento da sua entrega para a data e horário combinados. Se precisar de qualquer ajuste no endereço, nos avise por aqui!',
    order: 4,
    companyId: COMPANY_ID,
    createdAt: new Date().toISOString()
  },
  {
    id: 'qr-6',
    title: '🏍️ Envelopamento de Moto / Veículo',
    shortcut: '/envelopar',
    text: 'Para orçamento de envelopamento, trabalhamos com vinil automotivo premium e proteção UV. Qual é o modelo/ano e você prefere brilho, fosco ou personalização com arte?',
    order: 5,
    companyId: COMPANY_ID,
    createdAt: new Date().toISOString()
  }
];

export const getQuickRepliesSync = (): QuickReply[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
    }
  } catch {}
  return DEFAULT_QUICK_REPLIES;
};

export const carregarMensagensRapidas = async (): Promise<QuickReply[]> => {
  let locais: QuickReply[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      locais = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erro ao ler mensagens rápidas locais:', err);
  }

  // Tenta carregar do Supabase (configuracoes)
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('quick_replies')
      .eq('company_id', COMPANY_ID)
      .maybeSingle();

    if (!error && data?.quick_replies && Array.isArray(data.quick_replies) && data.quick_replies.length > 0) {
      const nuvem: QuickReply[] = data.quick_replies;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nuvem));
      return nuvem.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
  } catch {
    // Graceful fallback para localStorage
  }

  if (locais.length === 0) {
    locais = DEFAULT_QUICK_REPLIES;
    salvarMensagensRapidas(locais).catch(() => {});
  }

  return locais.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const salvarMensagensRapidas = async (lista: QuickReply[]): Promise<boolean> => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent('quick-replies-updated', { detail: lista }));

    // Persiste no Supabase se houver coluna
    try {
      await supabase
        .from('configuracoes')
        .update({ quick_replies: lista, updated_at: new Date().toISOString() })
        .eq('company_id', COMPANY_ID);
    } catch {
      // Ignora erro se coluna não existir no Postgres
    }
    return true;
  } catch (err) {
    console.error('Erro ao salvar mensagens rápidas:', err);
    return false;
  }
};

export const adicionarMensagemRapida = async (item: Omit<QuickReply, 'id' | 'createdAt'>): Promise<QuickReply> => {
  const lista = await carregarMensagensRapidas();
  const novo: QuickReply = {
    ...item,
    id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    companyId: COMPANY_ID,
    createdAt: new Date().toISOString(),
    order: lista.length
  };
  const atualizada = [...lista, novo];
  await salvarMensagensRapidas(atualizada);
  return novo;
};

export const atualizarMensagemRapida = async (id: string, patch: Partial<QuickReply>): Promise<boolean> => {
  const lista = await carregarMensagensRapidas();
  const atualizada = lista.map(item => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
  return salvarMensagensRapidas(atualizada);
};

export const excluirMensagemRapida = async (id: string): Promise<boolean> => {
  const lista = await carregarMensagensRapidas();
  const atualizada = lista.filter(item => item.id !== id);
  return salvarMensagensRapidas(atualizada);
};
