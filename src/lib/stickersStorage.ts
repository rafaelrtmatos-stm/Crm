import { supabase } from '../supabase';

export interface StickerItem {
  id: string;
  url: string;
  name?: string;
  created_at?: string;
  company_id?: string;
  category?: 'colecao' | 'favoritos' | 'historico' | 'salvas';
  is_favorite?: boolean;
  last_used_at?: string;
  source?: 'conversation' | 'system' | 'upload';
}

const LOCAL_STORAGE_KEY = 'rafa_arts_whatsapp_stickers_v1';
const HISTORY_STORAGE_KEY = 'rafa_arts_whatsapp_stickers_history_v1';
const FAVORITES_STORAGE_KEY = 'rafa_arts_whatsapp_stickers_favorites_v1';

// Figurinhas padrão da coleção do sistema
const DEFAULT_STICKERS: StickerItem[] = [
  {
    id: 'padrao-1',
    name: 'Joinha OK',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaJoinha&backgroundColor=06b6d4',
    created_at: new Date().toISOString(),
    category: 'colecao',
    source: 'system',
    is_favorite: true,
  },
  {
    id: 'padrao-2',
    name: 'Pedido Pronto',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaPronto&backgroundColor=10b981',
    created_at: new Date().toISOString(),
    category: 'colecao',
    source: 'system',
    is_favorite: true,
  },
  {
    id: 'padrao-3',
    name: 'Aguardando Aprovação',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaAguardando&backgroundColor=f59e0b',
    created_at: new Date().toISOString(),
    category: 'colecao',
    source: 'system',
  },
  {
    id: 'padrao-4',
    name: 'Obrigado!',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaObrigado&backgroundColor=8b5cf6',
    created_at: new Date().toISOString(),
    category: 'colecao',
    source: 'system',
    is_favorite: true,
  }
];

function notifyStickersChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('whatsapp-stickers-updated'));
  }
}

export async function carregarFigurinhas(): Promise<StickerItem[]> {
  let list: StickerItem[] = [];

  try {
    // 1. Tenta carregar do Supabase (tabela whatsapp_stickers)
    const { data, error } = await supabase
      .from('whatsapp_stickers')
      .select('*')
      .eq('company_id', 'rafa-arts')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      list = data.map((d: any) => ({
        ...d,
        category: d.category || 'colecao',
        source: d.source || 'system',
      }));
    }
  } catch (err) {
    console.warn('Figurinhas: tabela whatsapp_stickers ainda não disponível no Supabase, usando cache local:', err);
  }

  // Fallback e merge com localStorage
  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (salvo) {
      const parsed: StickerItem[] = JSON.parse(salvo);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (list.length === 0) {
          list = parsed;
        } else {
          // Merge mantendo novos
          const urls = new Set(list.map(s => s.url));
          for (const item of parsed) {
            if (!urls.has(item.url)) {
              list.push(item);
              urls.add(item.url);
            }
          }
        }
      }
    }
  } catch {}

  if (list.length === 0) {
    list = DEFAULT_STICKERS;
  }

  // Merge com favoritos marcados localmente
  try {
    const favsSalvos = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (favsSalvos) {
      const favUrls: string[] = JSON.parse(favsSalvos);
      const setFav = new Set(favUrls);
      list = list.map(item => ({
        ...item,
        is_favorite: item.is_favorite || setFav.has(item.url) || setFav.has(item.id),
      }));
    }
  } catch {}

  // Salva no localStorage consolidado
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}

  return list;
}

export async function salvarFigurinha(opts: {
  url: string;
  name?: string;
  category?: 'colecao' | 'favoritos' | 'historico' | 'salvas';
  is_favorite?: boolean;
  source?: 'conversation' | 'system' | 'upload';
}): Promise<StickerItem> {
  const nova: StickerItem = {
    id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    url: opts.url,
    name: opts.name || 'Figurinha ' + new Date().toLocaleDateString('pt-BR'),
    created_at: new Date().toISOString(),
    company_id: 'rafa-arts',
    category: opts.category || 'colecao',
    is_favorite: opts.is_favorite ?? (opts.category === 'favoritos'),
    source: opts.source || 'upload',
  };

  // 1. Salva no localStorage imediatamente
  try {
    const atuais = await carregarFigurinhas();
    const semDuplicada = atuais.filter(s => s.url !== opts.url);
    const atualizados = [nova, ...semDuplicada];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(atualizados));

    if (nova.is_favorite) {
      const favs = obterListaFavoritosIds();
      if (!favs.includes(nova.url)) {
        favs.unshift(nova.url);
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
      }
    }
  } catch {}

  // 2. Salva no Supabase se a tabela existir
  try {
    await supabase.from('whatsapp_stickers').insert({
      id: nova.id,
      company_id: 'rafa-arts',
      name: nova.name,
      url: nova.url,
      created_at: nova.created_at,
    });
  } catch (err) {
    console.warn('Figurinhas: salvamento remoto no Supabase não concluído (salvo localmente):', err);
  }

  notifyStickersChanged();
  return nova;
}

// Salva uma figurinha recebida na conversa direto nos Favoritos
export async function favoritarFigurinhaDaConversa(opts: {
  url: string;
  senderName?: string;
}): Promise<StickerItem> {
  const atuais = await carregarFigurinhas();
  const existente = atuais.find(s => s.url === opts.url);

  if (existente) {
    // Apenas marca como favorita
    existente.is_favorite = true;
    existente.category = 'favoritos';
    try {
      const semDuplicada = atuais.filter(s => s.url !== opts.url);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([existente, ...semDuplicada]));
      const favs = obterListaFavoritosIds();
      if (!favs.includes(opts.url)) {
        favs.unshift(opts.url);
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
      }
    } catch {}
    notifyStickersChanged();
    return existente;
  }

  // Cria nova como favorita
  const nome = opts.senderName ? `Figurinha de ${opts.senderName}` : 'Figurinha salva';
  return salvarFigurinha({
    url: opts.url,
    name: nome,
    category: 'favoritos',
    is_favorite: true,
    source: 'conversation',
  });
}

// Alterna favorito de uma figurinha
export async function toggleFavoritoFigurinha(stk: StickerItem): Promise<boolean> {
  try {
    const atuais = await carregarFigurinhas();
    const novoStatus = !stk.is_favorite;
    const atualizados = atuais.map(item => {
      if (item.url === stk.url || item.id === stk.id) {
        return {
          ...item,
          is_favorite: novoStatus,
          category: novoStatus ? ('favoritos' as const) : item.category,
        };
      }
      return item;
    });

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(atualizados));

    const favs = obterListaFavoritosIds();
    let novosFavs: string[];
    if (novoStatus) {
      novosFavs = Array.from(new Set([stk.url, ...favs]));
    } else {
      novosFavs = favs.filter(u => u !== stk.url && u !== stk.id);
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(novosFavs));

    notifyStickersChanged();
    return novoStatus;
  } catch {
    return false;
  }
}

function obterListaFavoritosIds(): string[] {
  try {
    const salvo = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

// Verifica se uma URL já está favoritada
export function isFigurinhaFavorita(url: string, stickersList?: StickerItem[]): boolean {
  if (stickersList && stickersList.length > 0) {
    const found = stickersList.find(s => s.url === url);
    if (found?.is_favorite) return true;
  }
  const favs = obterListaFavoritosIds();
  return favs.includes(url);
}

// Registra figurinha usada no histórico
export function registrarUsoFigurinha(stk: StickerItem): void {
  try {
    const itemComUso: StickerItem = {
      ...stk,
      last_used_at: new Date().toISOString(),
    };

    let historico: StickerItem[] = carregarHistoricoFigurinhas();
    historico = [itemComUso, ...historico.filter(s => s.url !== stk.url)].slice(0, 30);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historico));
    notifyStickersChanged();
  } catch {}
}

// Carrega o histórico de figurinhas usadas
export function carregarHistoricoFigurinhas(): StickerItem[] {
  try {
    const salvo = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function excluirFigurinha(id: string): Promise<boolean> {
  try {
    const atuais = await carregarFigurinhas();
    const itemRemover = atuais.find(s => s.id === id);
    const atualizados = atuais.filter(s => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(atualizados));

    if (itemRemover) {
      const favs = obterListaFavoritosIds().filter(u => u !== itemRemover.url && u !== itemRemover.id);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));

      const hist = carregarHistoricoFigurinhas().filter(s => s.url !== itemRemover.url && s.id !== itemRemover.id);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(hist));
    }
  } catch {}

  try {
    await supabase.from('whatsapp_stickers').delete().eq('id', id);
  } catch {}

  notifyStickersChanged();
  return true;
}

export async function uploadFigurinha(file: File): Promise<string> {
  const nomeLimpo = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const caminho = `stickers/${Date.now()}_${nomeLimpo}`;

  try {
    const { error: erroUpload } = await supabase.storage
      .from('whatsapp-media')
      .upload(caminho, file, { contentType: file.type || 'image/webp', upsert: true });

    if (!erroUpload) {
      const { data: publico } = supabase.storage.from('whatsapp-media').getPublicUrl(caminho);
      if (publico?.publicUrl) {
        return publico.publicUrl;
      }
    }
  } catch (e) {
    console.warn('Falha no upload para Storage whatsapp-media, convertendo para data URL:', e);
  }

  // Fallback: converter arquivo para DataURL base64 para uso local e envio
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
