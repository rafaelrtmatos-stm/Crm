import { supabase } from '../supabase';

export interface StickerItem {
  id: string;
  url: string;
  name?: string;
  created_at?: string;
  company_id?: string;
}

const LOCAL_STORAGE_KEY = 'rafa_arts_whatsapp_stickers_v1';

// Figurinhas padrão iniciais para não ficar vazio
const DEFAULT_STICKERS: StickerItem[] = [
  {
    id: 'padrao-1',
    name: 'Joinha OK',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaJoinha&backgroundColor=06b6d4',
    created_at: new Date().toISOString(),
  },
  {
    id: 'padrao-2',
    name: 'Pedido Pronto',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RafaPronto&backgroundColor=10b981',
    created_at: new Date().toISOString(),
  }
];

export async function carregarFigurinhas(): Promise<StickerItem[]> {
  try {
    // 1. Tenta carregar do Supabase (tabela whatsapp_stickers)
    const { data, error } = await supabase
      .from('whatsapp_stickers')
      .select('*')
      .eq('company_id', 'rafa-arts')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('Figurinhas: tabela whatsapp_stickers ainda não disponível no Supabase, usando cache local:', err);
  }

  // Fallback para localStorage
  try {
    const salvo = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return DEFAULT_STICKERS;
}

export async function salvarFigurinha(opts: { url: string; name?: string }): Promise<StickerItem> {
  const nova: StickerItem = {
    id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    url: opts.url,
    name: opts.name || 'Figurinha ' + new Date().toLocaleDateString('pt-BR'),
    created_at: new Date().toISOString(),
    company_id: 'rafa-arts',
  };

  // 1. Salva no localStorage imediatamente
  try {
    const atuais = await carregarFigurinhas();
    const semDuplicada = atuais.filter(s => s.url !== opts.url);
    const atualizados = [nova, ...semDuplicada];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(atualizados));
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

  return nova;
}

export async function excluirFigurinha(id: string): Promise<boolean> {
  try {
    const atuais = await carregarFigurinhas();
    const atualizados = atuais.filter(s => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(atualizados));
  } catch {}

  try {
    await supabase.from('whatsapp_stickers').delete().eq('id', id);
  } catch {}

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
