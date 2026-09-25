import { supabase } from '../supabase';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import type { AppUser } from '../types';

export interface StickerCollection {
  id: string;
  name: string;
  order: number;
  company_id: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
}

export interface StickerItem {
  id: string;
  name: string;
  url: string;
  collection_id?: string;
  collection_name?: string;
  company_id?: string;
  created_at?: string;
  created_by?: string;
  created_by_name?: string;
  order?: number;
  is_favorite?: boolean;
  last_used_at?: string;
  category?: 'colecao' | 'favoritos' | 'historico' | 'salvas';
  source?: 'conversation' | 'system' | 'upload';
}

export interface StickerHistoryItem {
  id: string;
  name: string;
  url: string;
  collection_id?: string;
  collection_name?: string;
  used_at: string;
}

const COMPANY_ID = 'rafa-arts';
const LOCAL_STORAGE_COLLECTIONS_KEY = 'rpro_whatsapp_sticker_collections_v2';
const LOCAL_STORAGE_STICKERS_KEY = 'rpro_whatsapp_stickers_v2';
const LOCAL_STORAGE_FAVORITES_KEY = 'rpro_whatsapp_stickers_favs_v2';
const LOCAL_STORAGE_HISTORY_KEY = 'rpro_whatsapp_stickers_hist_v2';
const LOCAL_STORAGE_DELETED_STICKERS_KEY = 'rpro_whatsapp_stickers_deleted_v2';

export function obterFigurinhasExcluidas(): Set<string> {
  const set = new Set<string>();
  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_DELETED_STICKERS_KEY);
    if (salvo) {
      const arr = JSON.parse(salvo);
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          if (typeof item === 'string' && item) set.add(item);
        });
      }
    }
  } catch {}
  return set;
}

export function marcarFigurinhaComoExcluida(id: string, url?: string): void {
  const set = obterFigurinhasExcluidas();
  if (id) set.add(id);
  if (url) set.add(url);
  try {
    localStorage.setItem(LOCAL_STORAGE_DELETED_STICKERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}

  // Sincroniza lista de excluídos no Firestore para que outros computadores também saibam
  try {
    setDoc(doc(db, 'whatsapp_stickers_meta', 'deleted_records'), {
      deleted_ids: Array.from(set),
      updated_at: new Date().toISOString(),
    }, { merge: true }).catch(() => {});
  } catch {}
}

export async function sincronizarExcluidosDoBanco(): Promise<Set<string>> {
  const set = obterFigurinhasExcluidas();
  try {
    const snap = await getDoc(doc(db, 'whatsapp_stickers_meta', 'deleted_records'));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.deleted_ids)) {
        data.deleted_ids.forEach(item => {
          if (typeof item === 'string' && item) set.add(item);
        });
        localStorage.setItem(LOCAL_STORAGE_DELETED_STICKERS_KEY, JSON.stringify(Array.from(set)));
      }
    }
  } catch {}
  return set;
}

// Coleções iniciais padrão compartilhadas caso o banco ainda esteja vazio
export const DEFAULT_COLLECTIONS: StickerCollection[] = [
  {
    id: 'col_memes',
    name: 'Memes',
    order: 0,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    created_by_name: 'Sistema',
  },
  {
    id: 'col_clientes',
    name: 'Clientes',
    order: 1,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    created_by_name: 'Sistema',
  },
  {
    id: 'col_rafa_arts',
    name: 'Rafa Arts',
    order: 2,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    created_by_name: 'Sistema',
  },
];

// Figurinhas iniciais padrão
export const DEFAULT_STICKERS: StickerItem[] = [
  {
    id: 'padrao-1',
    name: 'Joinha OK',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaJoinha&backgroundColor=06b6d4',
    collection_id: 'col_memes',
    collection_name: 'Memes',
    order: 0,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    source: 'system',
    is_favorite: true,
  },
  {
    id: 'padrao-2',
    name: 'Pedido Pronto',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaPronto&backgroundColor=10b981',
    collection_id: 'col_clientes',
    collection_name: 'Clientes',
    order: 0,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    source: 'system',
    is_favorite: true,
  },
  {
    id: 'padrao-3',
    name: 'Aguardando Aprovação',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaAguardando&backgroundColor=f59e0b',
    collection_id: 'col_clientes',
    collection_name: 'Clientes',
    order: 1,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    source: 'system',
  },
  {
    id: 'padrao-4',
    name: 'Obrigado!',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaObrigado&backgroundColor=8b5cf6',
    collection_id: 'col_rafa_arts',
    collection_name: 'Rafa Arts',
    order: 0,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    source: 'system',
    is_favorite: true,
  },
  {
    id: 'padrao-5',
    name: 'Qualidade Garantida',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaQualidade&backgroundColor=ec4899',
    collection_id: 'col_rafa_arts',
    collection_name: 'Rafa Arts',
    order: 1,
    company_id: COMPANY_ID,
    created_at: '2026-01-01T00:00:00.000Z',
    source: 'system',
  },
];

// Notificação de evento para re-render de telas abertas
function notificarAtualizacao() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('whatsapp-stickers-updated'));
  }
}

export function verificarAdmin(user?: AppUser | null): boolean {
  if (!user) {
    try {
      const savedUser = localStorage.getItem('rpro_user') || localStorage.getItem('user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.isAdmin || u.role === 'admin') return true;
      }
    } catch {}
    return true;
  }
  return Boolean(user.isAdmin || user.role === 'admin');
}

export function carregarColecoesDoCache(): StickerCollection[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_COLLECTIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_COLLECTIONS;
}

export function carregarFigurinhasDoCache(): StickerItem[] {
  const excluidos = obterFigurinhasExcluidas();
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_STICKERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(s => !excluidos.has(s.id) && !excluidos.has(s.url));
      }
    }
  } catch {}
  return DEFAULT_STICKERS.filter(s => !excluidos.has(s.id) && !excluidos.has(s.url));
}

/**
 * Escuta em tempo real mudanças nas Coleções e Figurinhas via Firestore onSnapshot
 * Qualquer alteração feita pelo Admin no PC 1 reflete nos demais computadores instantaneamente.
 */
export function subscribeToStickersData(callback: (data: { collections: StickerCollection[]; stickers: StickerItem[] }) => void): () => void {
  let collectionsState: StickerCollection[] = carregarColecoesDoCache();
  let stickersState: StickerItem[] = carregarFigurinhasDoCache();

  // Emite o estado inicial imediatamente para não haver tela em branco
  callback({ collections: collectionsState, stickers: stickersState });

  const qCols = collection(db, 'whatsapp_sticker_collections');
  const qStk = collection(db, 'whatsapp_stickers');

  const unsubCols = onSnapshot(qCols, (snap) => {
    if (!snap.empty) {
      const cols = snap.docs.map(d => ({ id: d.id, ...d.data() } as StickerCollection));
      cols.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      // Mescla com padrão caso alguma coleção padrão não exista
      const mapa = new Map<string, StickerCollection>();
      DEFAULT_COLLECTIONS.forEach(c => mapa.set(c.id, c));
      cols.forEach(c => mapa.set(c.id, c));
      collectionsState = Array.from(mapa.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else {
      const emCache = carregarColecoesDoCache();
      collectionsState = emCache.length > 0 ? emCache : DEFAULT_COLLECTIONS;
    }
    // Salva em cache local
    try {
      localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(collectionsState));
    } catch {}
    callback({ collections: collectionsState, stickers: stickersState });
  }, (err) => {
    console.warn('Erro ao escutar coleções no Firestore:', err);
  });

  const unsubStk = onSnapshot(qStk, (snap) => {
    const excluidos = obterFigurinhasExcluidas();
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StickerItem));
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      // Mescla com figurinhas em cache para nunca perder as recém-salvas, ignorando excluídas
      const mapa = new Map<string, StickerItem>();
      DEFAULT_STICKERS.forEach(s => {
        if (!excluidos.has(s.id) && !excluidos.has(s.url)) mapa.set(s.id, s);
      });
      carregarFigurinhasDoCache().forEach(s => {
        if (!excluidos.has(s.id) && !excluidos.has(s.url)) mapa.set(s.id, s);
      });
      items.forEach(s => {
        if (!excluidos.has(s.id) && !excluidos.has(s.url)) mapa.set(s.id, s);
      });
      stickersState = Array.from(mapa.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else {
      const emCache = carregarFigurinhasDoCache();
      stickersState = emCache.length > 0 ? emCache : DEFAULT_STICKERS.filter(s => !excluidos.has(s.id) && !excluidos.has(s.url));
    }
    // Salva em cache local
    try {
      localStorage.setItem(LOCAL_STORAGE_STICKERS_KEY, JSON.stringify(stickersState));
    } catch {}
    callback({ collections: collectionsState, stickers: stickersState });
  }, (err) => {
    console.warn('Erro ao escutar figurinhas no Firestore:', err);
  });

  // Listener para eventos de atualização local disparados na mesma aba
  const handleLocalUpdate = () => {
    collectionsState = carregarColecoesDoCache();
    stickersState = carregarFigurinhasDoCache();
    callback({ collections: collectionsState, stickers: stickersState });
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('whatsapp-stickers-updated', handleLocalUpdate);
  }

  return () => {
    unsubCols();
    unsubStk();
    if (typeof window !== 'undefined') {
      window.removeEventListener('whatsapp-stickers-updated', handleLocalUpdate);
    }
  };
}

/**
 * Carrega a lista de Coleções compartilhadas (Firestore com sincronização no Supabase e cache local)
 */
export async function carregarColecoes(): Promise<StickerCollection[]> {
  const mapa = new Map<string, StickerCollection>();

  // 1. Inicia com as coleções padrão e cache local para resposta instantânea
  DEFAULT_COLLECTIONS.forEach(c => mapa.set(c.id, c));
  const emCache = carregarColecoesDoCache();
  emCache.forEach(c => mapa.set(c.id, c));

  // 2. Busca do Firestore (centralizado)
  try {
    const snap = await getDocs(collection(db, 'whatsapp_sticker_collections'));
    if (!snap.empty) {
      snap.docs.forEach(d => {
        const item = { id: d.id, ...d.data() } as StickerCollection;
        mapa.set(item.id, item);
      });
    }
  } catch (err) {
    console.warn('Coleções: falha ao buscar no Firestore, tentando Supabase/cache:', err);
  }

  // 3. Busca do Supabase
  try {
    const { data } = await supabase
      .from('whatsapp_sticker_collections')
      .select('*')
      .order('display_order', { ascending: true });
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((d: any) => {
        mapa.set(d.id, {
          id: d.id,
          name: d.name,
          order: d.display_order ?? 0,
          company_id: d.company_id || COMPANY_ID,
          created_at: d.created_at,
          created_by: d.created_by,
          created_by_name: d.created_by_name,
        });
      });
    }
  } catch {}

  const list = Array.from(mapa.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  try {
    localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(list));
  } catch {}

  return list;
}

/**
 * Cria uma nova coleção de figurinhas (Apenas Administrador)
 */
export async function criarColecao(nome: string, user?: AppUser | null): Promise<StickerCollection> {
  if (!verificarAdmin(user)) {
    throw new Error('Apenas administradores podem criar coleções de figurinhas.');
  }

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    throw new Error('O nome da coleção é obrigatório.');
  }

  const colecoesAtuais = await carregarColecoes();
  const id = 'col_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const nova: StickerCollection = {
    id,
    name: nomeLimpo,
    order: colecoesAtuais.length,
    company_id: COMPANY_ID,
    created_at: new Date().toISOString(),
    created_by: user?.id,
    created_by_name: user?.name || user?.email || 'Administrador',
  };

  // 1. Salva no Firestore
  try {
    await setDoc(doc(db, 'whatsapp_sticker_collections', id), {
      id: nova.id,
      name: nova.name,
      order: nova.order,
      company_id: nova.company_id,
      created_at: nova.created_at,
      created_by: nova.created_by || '',
      created_by_name: nova.created_by_name || '',
    });
  } catch (err) {
    console.error('Erro ao salvar coleção no Firestore:', err);
  }

  // 2. Salva no Supabase (se a tabela existir)
  try {
    await supabase.from('whatsapp_sticker_collections').insert({
      id: nova.id,
      company_id: nova.company_id,
      name: nova.name,
      display_order: nova.order,
      created_at: nova.created_at,
      created_by: nova.created_by,
      created_by_name: nova.created_by_name,
    });
  } catch {}

  // 3. Atualiza cache local
  try {
    const atualizadas = [...colecoesAtuais, nova];
    localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(atualizadas));
  } catch {}

  notificarAtualizacao();
  return nova;
}

/**
 * Edita o nome de uma coleção (Apenas Administrador)
 */
export async function atualizarColecao(id: string, novoNome: string, user?: AppUser | null): Promise<boolean> {
  if (!verificarAdmin(user)) {
    throw new Error('Apenas administradores podem renomear coleções.');
  }

  const nomeLimpo = novoNome.trim();
  if (!nomeLimpo) {
    throw new Error('O nome da coleção não pode ficar vazio.');
  }

  // 1. Atualiza no Firestore
  try {
    await updateDoc(doc(db, 'whatsapp_sticker_collections', id), {
      name: nomeLimpo,
    });
  } catch (err) {
    console.error('Erro ao atualizar coleção no Firestore:', err);
  }

  // 2. Atualiza no Supabase
  try {
    await supabase.from('whatsapp_sticker_collections').update({ name: nomeLimpo }).eq('id', id);
  } catch {}

  // 3. Atualiza cache local
  try {
    const colecoes = await carregarColecoes();
    const atualizadas = colecoes.map(c => c.id === id ? { ...c, name: nomeLimpo } : c);
    localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(atualizadas));
  } catch {}

  notificarAtualizacao();
  return true;
}

/**
 * Exclui uma coleção e remaneja ou remove suas figurinhas (Apenas Administrador)
 */
export async function excluirColecao(id: string, user?: AppUser | null): Promise<boolean> {
  if (!verificarAdmin(user)) {
    throw new Error('Apenas administradores podem excluir coleções.');
  }

  // 1. Remove do Firestore
  try {
    await deleteDoc(doc(db, 'whatsapp_sticker_collections', id));
  } catch (err) {
    console.error('Erro ao excluir coleção no Firestore:', err);
  }

  // 2. Remove do Supabase
  try {
    await supabase.from('whatsapp_sticker_collections').delete().eq('id', id);
  } catch {}

  // 3. Atualiza cache local
  try {
    const colecoes = await carregarColecoes();
    const filtradas = colecoes.filter(c => c.id !== id);
    localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(filtradas));
  } catch {}

  notificarAtualizacao();
  return true;
}

/**
 * Reordena as coleções (Apenas Administrador)
 */
export async function reordenarColecoes(novasColecoes: StickerCollection[], user?: AppUser | null): Promise<boolean> {
  if (!verificarAdmin(user)) {
    throw new Error('Apenas administradores podem organizar coleções.');
  }

  const comOrdem = novasColecoes.map((c, idx) => ({ ...c, order: idx }));

  // Firestore
  try {
    const batch = writeBatch(db);
    comOrdem.forEach(c => {
      batch.update(doc(db, 'whatsapp_sticker_collections', c.id), { order: c.order });
    });
    await batch.commit();
  } catch {}

  // Supabase
  try {
    for (const c of comOrdem) {
      await supabase.from('whatsapp_sticker_collections').update({ display_order: c.order }).eq('id', c.id);
    }
  } catch {}

  try {
    localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(comOrdem));
  } catch {}

  notificarAtualizacao();
  return true;
}

/**
 * Carrega a lista completa de figurinhas compartilhadas
 */
export async function carregarFigurinhas(user?: AppUser | null): Promise<StickerItem[]> {
  const mapa = new Map<string, StickerItem>();
  const excluidos = await sincronizarExcluidosDoBanco();

  // 1. Inicia com as figurinhas padrão (exceto as excluídas)
  DEFAULT_STICKERS.forEach(s => {
    if (!excluidos.has(s.id) && !excluidos.has(s.url)) {
      mapa.set(s.id, s);
    }
  });

  // 2. Cache local (exceto excluídas)
  const emCache = carregarFigurinhasDoCache();
  emCache.forEach(s => {
    if (!excluidos.has(s.id) && !excluidos.has(s.url)) {
      mapa.set(s.id, s);
    }
  });

  // 3. Busca do Firestore (centralizado)
  try {
    const snap = await getDocs(collection(db, 'whatsapp_stickers'));
    if (!snap.empty) {
      snap.docs.forEach(d => {
        const item = { id: d.id, ...d.data() } as StickerItem;
        if (!excluidos.has(item.id) && !excluidos.has(item.url)) {
          mapa.set(item.id, item);
        }
      });
    }
  } catch (err) {
    console.warn('Figurinhas: falha no Firestore, tentando Supabase/cache:', err);
  }

  // 4. Busca do Supabase
  try {
    const { data } = await supabase
      .from('whatsapp_stickers')
      .select('*')
      .order('created_at', { ascending: false });
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((d: any) => {
        const item: StickerItem = {
          id: d.id,
          name: d.name || 'Figurinha',
          url: d.url,
          collection_id: d.collection_id || 'col_clientes',
          collection_name: d.collection_name || 'Clientes',
          company_id: d.company_id || COMPANY_ID,
          created_at: d.created_at,
          created_by: d.created_by,
          created_by_name: d.created_by_name,
          order: d.display_order ?? 0,
        };
        if (!excluidos.has(item.id) && !excluidos.has(item.url)) {
          mapa.set(item.id, item);
        }
      });
    }
  } catch {}

  let list = Array.from(mapa.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // 5. Marca os favoritos do usuário conectado
  const favoritosIds = await carregarFavoritos(user);
  const setFavs = new Set(favoritosIds);
  list = list.map(item => ({
    ...item,
    is_favorite: setFavs.has(item.id) || setFavs.has(item.url),
  }));

  try {
    localStorage.setItem(LOCAL_STORAGE_STICKERS_KEY, JSON.stringify(list));
  } catch {}

  return list;
}

/**
 * Salva uma nova figurinha na biblioteca oficial (Apenas Administrador)
 */
export async function salvarFigurinha(opts: {
  url: string;
  name: string;
  collection_id?: string;
  collection_name?: string;
  order?: number;
  user?: AppUser | null;
  source?: 'conversation' | 'system' | 'upload';
  is_favorite?: boolean;
}): Promise<StickerItem> {
  // Se for upload / cadastro administrativo, exige admin
  if (opts.source !== 'conversation' && !verificarAdmin(opts.user)) {
    throw new Error('Apenas administradores podem cadastrar novas figurinhas na biblioteca.');
  }

  const colecoes = await carregarColecoes();
  let collectionId = opts.collection_id || colecoes[0]?.id || 'col_memes';
  let collectionName = opts.collection_name;
  if (!collectionName) {
    const colFound = colecoes.find(c => c.id === collectionId);
    collectionName = colFound?.name || 'Geral';
  }

  const id = 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const nova: StickerItem = {
    id,
    name: opts.name.trim() || 'Figurinha',
    url: opts.url,
    collection_id: collectionId,
    collection_name: collectionName,
    company_id: COMPANY_ID,
    created_at: new Date().toISOString(),
    created_by: opts.user?.id,
    created_by_name: opts.user?.name || opts.user?.email || 'Administrador',
    order: opts.order ?? 0,
    source: opts.source || 'upload',
    is_favorite: opts.is_favorite ?? false,
  };

  // 1. Salva no Firestore
  try {
    await setDoc(doc(db, 'whatsapp_stickers', id), {
      id: nova.id,
      name: nova.name,
      url: nova.url,
      collection_id: nova.collection_id,
      collection_name: nova.collection_name,
      company_id: nova.company_id,
      created_at: nova.created_at,
      created_by: nova.created_by || '',
      created_by_name: nova.created_by_name || '',
      order: nova.order,
      source: nova.source,
    });
  } catch (err) {
    console.error('Erro ao salvar figurinha no Firestore:', err);
  }

  // 2. Salva no Supabase
  try {
    await supabase.from('whatsapp_stickers').insert({
      id: nova.id,
      company_id: nova.company_id,
      name: nova.name,
      url: nova.url,
      collection_id: nova.collection_id,
      collection_name: nova.collection_name,
      display_order: nova.order,
      created_at: nova.created_at,
      created_by: nova.created_by,
      created_by_name: nova.created_by_name,
    });
  } catch {}

  // 3. Atualiza cache local
  try {
    const atuais = await carregarFigurinhas(opts.user);
    const atualizados = [nova, ...atuais.filter(s => s.id !== nova.id && s.url !== nova.url)];
    localStorage.setItem(LOCAL_STORAGE_STICKERS_KEY, JSON.stringify(atualizados));
  } catch {}

  notificarAtualizacao();
  return nova;
}

/**
 * Atualiza dados de uma figurinha (nome, coleção de destino) (Apenas Administrador)
 */
export async function atualizarFigurinha(
  id: string,
  opts: { name?: string; collection_id?: string },
  user?: AppUser | null
): Promise<boolean> {
  if (!verificarAdmin(user)) {
    throw new Error('Apenas administradores podem editar figurinhas.');
  }

  const patch: Record<string, any> = {};
  if (opts.name !== undefined) patch.name = opts.name.trim();
  if (opts.collection_id !== undefined) {
    patch.collection_id = opts.collection_id;
    const colecoes = await carregarColecoes();
    const colFound = colecoes.find(c => c.id === opts.collection_id);
    if (colFound) patch.collection_name = colFound.name;
  }

  try {
    await updateDoc(doc(db, 'whatsapp_stickers', id), patch);
  } catch (err) {
    console.error('Erro ao atualizar figurinha no Firestore:', err);
  }

  try {
    const patchSupabase: any = {};
    if (patch.name) patchSupabase.name = patch.name;
    if (patch.collection_id) patchSupabase.collection_id = patch.collection_id;
    if (patch.collection_name) patchSupabase.collection_name = patch.collection_name;
    await supabase.from('whatsapp_stickers').update(patchSupabase).eq('id', id);
  } catch {}

  try {
    const atuais = await carregarFigurinhas(user);
    const atualizados = atuais.map(s => s.id === id ? { ...s, ...patch } : s);
    localStorage.setItem(LOCAL_STORAGE_STICKERS_KEY, JSON.stringify(atualizados));
  } catch {}

  notificarAtualizacao();
  return true;
}

/**
 * Remove uma figurinha da biblioteca (Apenas Administrador)
 */
export async function excluirFigurinha(id: string, user?: AppUser | null, url?: string): Promise<boolean> {
  if (!verificarAdmin(user)) {
    throw new Error('Apenas administradores podem excluir figurinhas da biblioteca.');
  }

  // 1. Marca imediatamente como excluída de forma persistente (impede que reapareça)
  marcarFigurinhaComoExcluida(id, url);

  // 2. Remove do Firestore por ID
  try {
    await deleteDoc(doc(db, 'whatsapp_stickers', id));
  } catch (err) {
    console.warn('Erro ao excluir figurinha do Firestore por id:', err);
  }

  // Se tiver URL, também remove qualquer documento com a mesma URL no Firestore
  if (url) {
    try {
      const qUrl = query(collection(db, 'whatsapp_stickers'), where('url', '==', url));
      const snapUrl = await getDocs(qUrl);
      for (const d of snapUrl.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch {}
  }

  // 3. Remove do Supabase
  try {
    await supabase.from('whatsapp_stickers').delete().eq('id', id);
    if (url) {
      await supabase.from('whatsapp_stickers').delete().eq('url', url);
    }
  } catch {}

  // 4. Atualiza cache local sem ressuscitar
  try {
    const salvos = carregarFigurinhasDoCache();
    const filtrados = salvos.filter(s => s.id !== id && (!url || s.url !== url));
    localStorage.setItem(LOCAL_STORAGE_STICKERS_KEY, JSON.stringify(filtrados));
  } catch {}

  // 5. Remove dos favoritos e do histórico do usuário local
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(LOCAL_STORAGE_FAVORITES_KEY) || key.startsWith(LOCAL_STORAGE_HISTORY_KEY))) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              const semStk = parsed.filter((item: any) => {
                if (typeof item === 'string') return item !== id && (!url || item !== url);
                if (item && typeof item === 'object') return item.id !== id && (!url || item.url !== url);
                return true;
              });
              localStorage.setItem(key, JSON.stringify(semStk));
            }
          } catch {}
        }
      }
    }
  } catch {}

  notificarAtualizacao();
  return true;
}

/**
 * Reordena as figurinhas dentro de uma coleção (Apenas Administrador)
 */
export async function reordenarFigurinhas(stickers: StickerItem[], user?: AppUser | null): Promise<boolean> {
  if (!verificarAdmin(user)) {
    throw new Error('Apenas administradores podem organizar figurinhas.');
  }

  const comOrdem = stickers.map((s, idx) => ({ ...s, order: idx }));

  try {
    const batch = writeBatch(db);
    comOrdem.forEach(s => {
      batch.update(doc(db, 'whatsapp_stickers', s.id), { order: s.order });
    });
    await batch.commit();
  } catch {}

  try {
    for (const s of comOrdem) {
      await supabase.from('whatsapp_stickers').update({ display_order: s.order }).eq('id', s.id);
    }
  } catch {}

  notificarAtualizacao();
  return true;
}

// -------------------------------------------------------------
// FAVORITOS E HISTÓRICO PERSISTENTES (POR USUÁRIO)
// -------------------------------------------------------------

function obterChaveUsuario(user?: AppUser | null): string {
  if (user?.id) return `user_${user.id}`;
  if (user?.email) return `email_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return 'default_user';
}

/**
 * Carrega a lista de favoritos do usuário (do banco persistente)
 */
export async function carregarFavoritos(user?: AppUser | null): Promise<string[]> {
  const chave = obterChaveUsuario(user);

  // 1. Tenta Firestore
  try {
    const docRef = doc(db, 'whatsapp_sticker_user_data', chave);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.favorites)) {
        localStorage.setItem(`${LOCAL_STORAGE_FAVORITES_KEY}_${chave}`, JSON.stringify(data.favorites));
        return data.favorites;
      }
    }
  } catch {}

  // 2. Cache local
  try {
    const salvo = localStorage.getItem(`${LOCAL_STORAGE_FAVORITES_KEY}_${chave}`) || localStorage.getItem(LOCAL_STORAGE_FAVORITES_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * Alterna favorito para o usuário atual
 */
export async function toggleFavorito(stk: StickerItem, user?: AppUser | null): Promise<boolean> {
  const chave = obterChaveUsuario(user);
  const favsAtuais = await carregarFavoritos(user);
  const identifier = stk.id || stk.url;

  const jaFavoritado = favsAtuais.includes(stk.id) || favsAtuais.includes(stk.url);
  let novosFavs: string[];

  if (jaFavoritado) {
    novosFavs = favsAtuais.filter(item => item !== stk.id && item !== stk.url);
  } else {
    novosFavs = [identifier, ...favsAtuais];
  }

  // 1. Salva no cache local
  try {
    localStorage.setItem(`${LOCAL_STORAGE_FAVORITES_KEY}_${chave}`, JSON.stringify(novosFavs));
    localStorage.setItem(LOCAL_STORAGE_FAVORITES_KEY, JSON.stringify(novosFavs));
  } catch {}

  // 2. Salva no Firestore
  try {
    const docRef = doc(db, 'whatsapp_sticker_user_data', chave);
    await setDoc(docRef, {
      user_id: user?.id || 'anonimo',
      user_name: user?.name || '',
      favorites: novosFavs,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar favoritos no Firestore:', err);
  }

  notificarAtualizacao();
  return !jaFavoritado;
}

export function isFigurinhaFavorita(identifier: string, favoritesList?: string[]): boolean {
  if (!identifier) return false;
  if (favoritesList && favoritesList.length > 0) {
    return favoritesList.includes(identifier);
  }
  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_FAVORITES_KEY);
    if (salvo) {
      const parsed: string[] = JSON.parse(salvo);
      if (Array.isArray(parsed)) return parsed.includes(identifier);
    }
  } catch {}
  return false;
}

/**
 * Carrega o histórico de uso recente de figurinhas do usuário
 */
export async function carregarHistorico(user?: AppUser | null): Promise<StickerItem[]> {
  const chave = obterChaveUsuario(user);

  // 1. Tenta Firestore
  try {
    const docRef = doc(db, 'whatsapp_sticker_user_data', chave);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.history)) {
        localStorage.setItem(`${LOCAL_STORAGE_HISTORY_KEY}_${chave}`, JSON.stringify(data.history));
        return data.history;
      }
    }
  } catch {}

  // 2. Cache local
  try {
    const salvo = localStorage.getItem(`${LOCAL_STORAGE_HISTORY_KEY}_${chave}`) || localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

/**
 * Registra o envio de uma figurinha no histórico do usuário
 */
export async function registrarUso(stk: StickerItem, user?: AppUser | null): Promise<void> {
  const chave = obterChaveUsuario(user);
  const itemHistorico: StickerItem = {
    ...stk,
    last_used_at: new Date().toISOString(),
  };

  try {
    const historicoAtual = await carregarHistorico(user);
    const semDuplicata = historicoAtual.filter(s => s.url !== stk.url && s.id !== stk.id);
    const novoHistorico = [itemHistorico, ...semDuplicata].slice(0, 40);

    // 1. Salva local
    localStorage.setItem(`${LOCAL_STORAGE_HISTORY_KEY}_${chave}`, JSON.stringify(novoHistorico));
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(novoHistorico));

    // 2. Salva no Firestore
    const docRef = doc(db, 'whatsapp_sticker_user_data', chave);
    await setDoc(docRef, {
      user_id: user?.id || 'anonimo',
      user_name: user?.name || '',
      history: novoHistorico,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Erro ao registrar histórico de figurinha:', err);
  }

  notificarAtualizacao();
}

/**
 * Salva uma figurinha recebida na conversa diretamente nos Favoritos do usuário
 */
export async function favoritarFigurinhaDaConversa(opts: {
  url: string;
  senderName?: string;
  user?: AppUser | null;
}): Promise<StickerItem> {
  const todas = await carregarFigurinhas(opts.user);
  let encontrada = todas.find(s => s.url === opts.url);

  if (!encontrada) {
    // Cadastra figurinha na coleção Clientes
    const colecoes = await carregarColecoes();
    const colClientes = colecoes.find(c => c.name.toLowerCase().includes('cliente')) || colecoes[0];
    encontrada = await salvarFigurinha({
      url: opts.url,
      name: opts.senderName ? `Figurinha de ${opts.senderName}` : 'Figurinha salva',
      collection_id: colClientes?.id || 'col_clientes',
      collection_name: colClientes?.name || 'Clientes',
      user: opts.user,
      source: 'conversation',
      is_favorite: true,
    });
  }

  // Marca como favorita
  await toggleFavorito(encontrada, opts.user);
  return encontrada;
}

// -------------------------------------------------------------
// UPLOAD DE IMAGEM DA FIGURINHA
// -------------------------------------------------------------

export async function uploadFigurinhaArquivo(file: File): Promise<string> {
  const nomeLimpo = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const caminho = `stickers/${Date.now()}_${nomeLimpo}`;
  const contentType = file.type || 'image/webp';

  // 1. Tenta bucket whatsapp-media do Supabase
  try {
    const { error: err1 } = await supabase.storage
      .from('whatsapp-media')
      .upload(caminho, file, { contentType, upsert: true });

    if (!err1) {
      const { data: pub } = supabase.storage.from('whatsapp-media').getPublicUrl(caminho);
      if (pub?.publicUrl) return pub.publicUrl;
    }
  } catch {}

  // 2. Tenta bucket profile-photos do Supabase (que tem política aberta)
  try {
    const { error: err2 } = await supabase.storage
      .from('profile-photos')
      .upload(caminho, file, { contentType, upsert: true });

    if (!err2) {
      const { data: pub2 } = supabase.storage.from('profile-photos').getPublicUrl(caminho);
      if (pub2?.publicUrl) return pub2.publicUrl;
    }
  } catch {}

  // 3. Fallback: DataURL base64 persistido
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Aliases para compatibilidade reversa
export const uploadFigurinha = uploadFigurinhaArquivo;
export const toggleFavoritoFigurinha = (stk: StickerItem) => toggleFavorito(stk);
export const carregarHistoricoFigurinhas = () => carregarHistorico();
export const registrarUsoFigurinha = (stk: StickerItem) => registrarUso(stk);

// Inicializadores automáticos no banco se vazio
async function inicializarColecoesPadraoNoBanco(): Promise<void> {
  try {
    for (const c of DEFAULT_COLLECTIONS) {
      await setDoc(doc(db, 'whatsapp_sticker_collections', c.id), c);
      try {
        await supabase.from('whatsapp_sticker_collections').insert({
          id: c.id,
          company_id: c.company_id,
          name: c.name,
          display_order: c.order,
          created_at: c.created_at,
          created_by_name: 'Sistema',
        });
      } catch {}
    }
  } catch {}
}

async function inicializarFigurinhasPadraoNoBanco(): Promise<void> {
  try {
    for (const s of DEFAULT_STICKERS) {
      await setDoc(doc(db, 'whatsapp_stickers', s.id), s);
      try {
        await supabase.from('whatsapp_stickers').insert({
          id: s.id,
          company_id: s.company_id,
          name: s.name,
          url: s.url,
          collection_id: s.collection_id,
          collection_name: s.collection_name,
          display_order: s.order,
          created_at: s.created_at,
        });
      } catch {}
    }
  } catch {}
}
