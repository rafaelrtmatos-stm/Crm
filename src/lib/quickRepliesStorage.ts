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

const BUCKET_MIDIA = 'whatsapp-media';

const extDoMime = (mime: string): string => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
};

// Sobe a imagem da mensagem salva para o Storage do Supabase e devolve a URL publica.
// (Antes a imagem ia como base64 dentro do JSON, estourava o localStorage e o update
// silenciosamente falhava no banco.)
export const uploadImagemMensagemRapida = async (arquivo: Blob): Promise<string | null> => {
  try {
    const mime = arquivo.type || 'image/jpeg';
    const caminho = `respostas-rapidas/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extDoMime(mime)}`;
    const { error } = await supabase.storage
      .from(BUCKET_MIDIA)
      .upload(caminho, arquivo, { contentType: mime, upsert: false });
    if (error) {
      console.error('Erro ao subir imagem da mensagem rapida:', error);
      return null;
    }
    const { data } = supabase.storage.from(BUCKET_MIDIA).getPublicUrl(caminho);
    return data?.publicUrl || null;
  } catch (err) {
    console.error('Erro ao subir imagem da mensagem rapida:', err);
    return null;
  }
};

// Mensagens antigas que ainda guardam a imagem como base64 (data:) sao migradas pro Storage
// na proxima vez que a lista for salva.
const migrarImagensBase64 = async (lista: QuickReply[]): Promise<QuickReply[]> => {
  return Promise.all(lista.map(async (item) => {
    if (!item.imageUrl || !item.imageUrl.startsWith('data:')) return item;
    try {
      const blob = await (await fetch(item.imageUrl)).blob();
      const url = await uploadImagemMensagemRapida(blob);
      return url ? { ...item, imageUrl: url } : item;
    } catch {
      return item;
    }
  }));
};

export const salvarMensagensRapidas = async (lista: QuickReply[]): Promise<boolean> => {
  try {
    const listaFinal = await migrarImagensBase64(lista);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(listaFinal));
    } catch (err) {
      console.warn('Nao foi possivel gravar as mensagens rapidas no localStorage (cheio?):', err);
    }
    window.dispatchEvent(new CustomEvent('quick-replies-updated', { detail: listaFinal }));

    // Tenta persistir no Supabase (configuracoes.quick_replies)
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert(
          { company_id: COMPANY_ID, quick_replies: listaFinal, updated_at: new Date().toISOString() },
          { onConflict: 'company_id' }
        );
      if (error) {
        // Se a coluna ainda não foi criada no banco (PGRST204) ou houve erro de cache de schema,
        // mantém salvo localmente sem travar a experiência do usuário.
        if (
          error.code === 'PGRST204' ||
          error.message?.includes('quick_replies') ||
          error.message?.includes('schema cache')
        ) {
          console.warn('Aviso: coluna "quick_replies" ainda não existe em configuracoes no Supabase. Salvo com sucesso no armazenamento local.');
          return true;
        }
        console.warn('Aviso ao sincronizar mensagens rápidas no Supabase:', error.message || error);
        return true;
      }
    } catch (supabaseErr) {
      console.warn('Aviso ao persistir mensagens rápidas no Supabase (usando local):', supabaseErr);
      return true;
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
  const ok = await salvarMensagensRapidas(atualizada);
  if (!ok) throw new Error('Falha ao salvar a mensagem rápida no Supabase');
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
