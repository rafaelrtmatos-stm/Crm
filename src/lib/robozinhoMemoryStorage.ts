import { supabase } from '../supabase';

export interface RobozinhoMemoryBlock {
  id: string;
  title: string;
  content: string;
  category: 'precos' | 'empresa' | 'servicos' | 'geral';
  autoLearned?: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

const COMPANY_ID = 'rafa-arts';
const LOCAL_STORAGE_KEY = 'rpro_robozinho_memory_blocks';
const AUTO_LEARN_KEY = 'rpro_robozinho_auto_learn';
const SCRIPTS_STORAGE_KEY = 'rpro_robozinho_scripts';

export interface RobozinhoScripts {
  companyInfo: string;
  positiveScript: string;
  negativeScript: string;
}

export const DEFAULT_ROBOZINHO_SCRIPTS: RobozinhoScripts = {
  companyInfo: `Rafa Arts — Comunicação Visual, Gráfica & Personalizados
Endereço: Atendimento e retirada no balcão da loja física ou entrega via motoboy para a região.
Horário de Atendimento: Segunda a sexta das 08:00 às 18:00. Sábados das 08:00 às 12:00.
Formas de Pagamento: Aceitamos PIX, Cartão de Crédito/Débito e Dinheiro.
Política de Sinal: Para qualquer serviço personalizado ou sob encomenda, é exigido sinal de 50% para aprovação da arte e início da produção, e o restante na entrega/retirada.`,
  positiveScript: `- Cumprimente o cliente com simpatia e cordialidade (chame pelo primeiro nome sempre que informado).
- Fale em nome da Rafa Arts de forma acolhedora ("nós da Rafa Arts", "com a gente").
- Enfatize a qualidade premium dos materiais e acabamentos (impressão de alta resolução, pintura automotiva e verniz alto brilho em capacetes, lonas com ilhós reforçados).
- Sempre convide o cliente a enviar fotos de referência, medidas ou ideia da arte para agilizar o orçamento.
- Lembre com gentileza sobre a regra de 50% de sinal para dar entrada na produção.`,
  negativeScript: `- NUNCA prometa prazos de entrega urgentes (para o mesmo dia ou dia seguinte) sem confirmação prévia com a produção.
- NUNCA conceda descontos fora da tabela ou altere preços por conta própria sem autorização do Rafael.
- NUNCA diga apenas "não fazemos" de forma fria — sempre ofereça uma alternativa viável ou informe que vai consultar a equipe de produção.
- NUNCA use gírias inadequadas, abreviações confusas ou tom rude/impaciente.
- NUNCA passe contas bancárias ou chaves PIX que não sejam os canais oficiais da loja.`
};

export const DEFAULT_MEMORY_BLOCKS: RobozinhoMemoryBlock[] = [
  {
    id: 'block-horario',
    title: 'Horário de Atendimento',
    content: 'Segunda a sexta das 08:00 às 18:00. Sábados das 08:00 às 12:00.',
    category: 'empresa',
    autoLearned: false,
    source: 'Padrão da Empresa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'block-capacete',
    title: 'Capacetes Personalizados',
    content: 'Personalização de capacete a partir de R$ 180,00 com pintura automotiva e acabamento em verniz alto brilho. Prazo de produção: 5 a 7 dias úteis.',
    category: 'precos',
    autoLearned: false,
    source: 'Padrão da Empresa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'block-pagamento',
    title: 'Formas de Pagamento & Sinal',
    content: 'Aceitamos PIX, Cartão de Crédito/Débito e Dinheiro. Para pedidos sob encomenda é exigido sinal de 50% na aprovação e o restante na entrega.',
    category: 'empresa',
    autoLearned: false,
    source: 'Padrão da Empresa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'block-banners',
    title: 'Banners e Lonas',
    content: 'Impressão de banner em lona de alta resolução com acabamento em bastão e cordinha ou ilhós metálicos. Prazo rápido de entrega.',
    category: 'servicos',
    autoLearned: false,
    source: 'Padrão da Empresa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

let cachedMemoryBlocks: RobozinhoMemoryBlock[] = [];
let cachedAutoLearn: boolean = true;
let cachedScripts: RobozinhoScripts = DEFAULT_ROBOZINHO_SCRIPTS;
let realtimeInitialized = false;

// Inicializa cache local
try {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
  if (raw) cachedMemoryBlocks = JSON.parse(raw);
  const rawLearn = typeof window !== 'undefined' ? localStorage.getItem(AUTO_LEARN_KEY) : null;
  if (rawLearn !== null) cachedAutoLearn = rawLearn === 'true';
  const rawScripts = typeof window !== 'undefined' ? localStorage.getItem(SCRIPTS_STORAGE_KEY) : null;
  if (rawScripts) cachedScripts = { ...DEFAULT_ROBOZINHO_SCRIPTS, ...JSON.parse(rawScripts) };
} catch (e) {
  cachedMemoryBlocks = DEFAULT_MEMORY_BLOCKS;
  cachedScripts = DEFAULT_ROBOZINHO_SCRIPTS;
}

export const inicializarSincronizacaoRealtimeMemoria = () => {
  if (realtimeInitialized || typeof window === 'undefined') return;
  realtimeInitialized = true;

  try {
    supabase
      .channel('robozinho-memory-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'robozinho_config', filter: `company_id=eq.${COMPANY_ID}` },
        (payload: any) => {
          const row = payload?.new;
          const qr = row?.whatsapp_qr_integration;
          if (qr && Array.isArray(qr.memory_blocks)) {
            cachedMemoryBlocks = qr.memory_blocks;
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(qr.memory_blocks));
            } catch {}
          }
          if (qr && typeof qr.auto_learn_enabled === 'boolean') {
            cachedAutoLearn = qr.auto_learn_enabled;
            try {
              localStorage.setItem(AUTO_LEARN_KEY, String(qr.auto_learn_enabled));
            } catch {}
          }
          if (qr && (qr.company_info !== undefined || qr.positive_script !== undefined || qr.negative_script !== undefined)) {
            cachedScripts = {
              companyInfo: qr.company_info ?? cachedScripts.companyInfo,
              positiveScript: qr.positive_script ?? cachedScripts.positiveScript,
              negativeScript: qr.negative_script ?? cachedScripts.negativeScript,
            };
            try {
              localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(cachedScripts));
            } catch {}
            window.dispatchEvent(new CustomEvent('robozinho-scripts-updated', {
              detail: cachedScripts
            }));
          }
          window.dispatchEvent(new CustomEvent('robozinho-memory-updated', { 
            detail: { blocks: cachedMemoryBlocks, autoLearn: cachedAutoLearn } 
          }));
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime de memória do Robozinho indisponível:', err);
  }
};

export const carregarMemoriaRobozinho = async (): Promise<{ blocks: RobozinhoMemoryBlock[]; autoLearn: boolean }> => {
  inicializarSincronizacaoRealtimeMemoria();

  try {
    const { data, error } = await supabase
      .from('robozinho_config')
      .select('whatsapp_qr_integration')
      .eq('company_id', COMPANY_ID)
      .maybeSingle();

    if (!error && data?.whatsapp_qr_integration) {
      const qr = data.whatsapp_qr_integration;
      if (Array.isArray(qr.memory_blocks) && qr.memory_blocks.length > 0) {
        cachedMemoryBlocks = qr.memory_blocks;
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(qr.memory_blocks)); } catch {}
      } else {
        // Se ainda não tinha blocos gravados no banco, inicializa com os padrões
        await salvarBlocosMemoria(DEFAULT_MEMORY_BLOCKS, typeof qr.auto_learn_enabled === 'boolean' ? qr.auto_learn_enabled : true);
        return { blocks: DEFAULT_MEMORY_BLOCKS, autoLearn: true };
      }

      if (typeof qr.auto_learn_enabled === 'boolean') {
        cachedAutoLearn = qr.auto_learn_enabled;
        try { localStorage.setItem(AUTO_LEARN_KEY, String(qr.auto_learn_enabled)); } catch {}
      }

      return { blocks: cachedMemoryBlocks, autoLearn: cachedAutoLearn };
    }
  } catch (err) {
    console.warn('Falha ao carregar memória do Supabase, usando cache local:', err);
  }

  if (cachedMemoryBlocks.length === 0) {
    cachedMemoryBlocks = DEFAULT_MEMORY_BLOCKS;
  }
  return { blocks: cachedMemoryBlocks, autoLearn: cachedAutoLearn };
};

export const salvarBlocosMemoria = async (
  blocos: RobozinhoMemoryBlock[], 
  autoLearn?: boolean
): Promise<void> => {
  cachedMemoryBlocks = blocos;
  if (typeof autoLearn === 'boolean') cachedAutoLearn = autoLearn;

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(blocos));
      if (typeof autoLearn === 'boolean') localStorage.setItem(AUTO_LEARN_KEY, String(autoLearn));
      window.dispatchEvent(new CustomEvent('robozinho-memory-updated', {
        detail: { blocks: blocos, autoLearn: cachedAutoLearn }
      }));
    }

    const { data: curr } = await supabase
      .from('robozinho_config')
      .select('whatsapp_qr_integration')
      .eq('company_id', COMPANY_ID)
      .maybeSingle();

    const currentQr = curr?.whatsapp_qr_integration || {};
    const updatedQr = {
      ...currentQr,
      memory_blocks: blocos,
      auto_learn_enabled: typeof autoLearn === 'boolean' ? autoLearn : cachedAutoLearn,
    };

    await supabase
      .from('robozinho_config')
      .upsert(
        {
          company_id: COMPANY_ID,
          whatsapp_qr_integration: updatedQr,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
  } catch (err) {
    console.error('Erro ao salvar blocos de memória no banco:', err);
  }
};

export const setAprendizadoAutomaticoAtivo = async (ativo: boolean): Promise<void> => {
  cachedAutoLearn = ativo;
  await salvarBlocosMemoria(cachedMemoryBlocks, ativo);
};

export const getMemoryBlocksSync = (): RobozinhoMemoryBlock[] => {
  if (cachedMemoryBlocks && cachedMemoryBlocks.length > 0) return cachedMemoryBlocks;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_MEMORY_BLOCKS;
};

export const isAprendizadoAutomaticoAtivo = (): boolean => {
  return cachedAutoLearn;
};

export const carregarScriptsRobozinho = async (): Promise<RobozinhoScripts> => {
  inicializarSincronizacaoRealtimeMemoria();
  try {
    const { data, error } = await supabase
      .from('robozinho_config')
      .select('whatsapp_qr_integration')
      .eq('company_id', COMPANY_ID)
      .maybeSingle();

    if (!error && data?.whatsapp_qr_integration) {
      const qr = data.whatsapp_qr_integration;
      if (qr.company_info || qr.positive_script || qr.negative_script) {
        cachedScripts = {
          companyInfo: qr.company_info ?? DEFAULT_ROBOZINHO_SCRIPTS.companyInfo,
          positiveScript: qr.positive_script ?? DEFAULT_ROBOZINHO_SCRIPTS.positiveScript,
          negativeScript: qr.negative_script ?? DEFAULT_ROBOZINHO_SCRIPTS.negativeScript,
        };
        try { localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(cachedScripts)); } catch {}
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar scripts:', err);
  }
  return cachedScripts;
};

export const salvarScriptsRobozinho = async (novos: Partial<RobozinhoScripts>): Promise<void> => {
  cachedScripts = { ...cachedScripts, ...novos };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(cachedScripts));
      window.dispatchEvent(new CustomEvent('robozinho-scripts-updated', { detail: cachedScripts }));
    }

    const { data: curr } = await supabase
      .from('robozinho_config')
      .select('whatsapp_qr_integration')
      .eq('company_id', COMPANY_ID)
      .maybeSingle();

    const currentQr = curr?.whatsapp_qr_integration || {};
    const updatedQr = {
      ...currentQr,
      company_info: cachedScripts.companyInfo,
      positive_script: cachedScripts.positiveScript,
      negative_script: cachedScripts.negativeScript,
    };

    await supabase
      .from('robozinho_config')
      .upsert(
        {
          company_id: COMPANY_ID,
          whatsapp_qr_integration: updatedQr,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
  } catch (err) {
    console.error('Erro ao salvar scripts no banco:', err);
    throw err;
  }
};

export const getScriptsRobozinhoSync = (): RobozinhoScripts => {
  return cachedScripts;
};

/**
 * Aprendizado Inteligente Contínuo:
 * Quando o atendente responde ao cliente no WhatsApp com informações úteis
 * (preços, valores, orçamentos, prazos, condições), e o aprendizado estiver LIGADO,
 * o Robozinho analisa e salva ou atualiza o bloco de memória correspondente.
 */
export const detectarEAprenderDoChat = async (params: {
  clientMessage: string;
  attendantReply: string;
  clientName?: string;
  isGroup?: boolean;
  phone?: string;
}): Promise<boolean> => {
  if (!cachedAutoLearn) return false;

  // SEGURANÇA: ignora 100% dos grupos de WhatsApp. O Robozinho só aprende em conversas 1 a 1 com clientes reais.
  if (params.isGroup) return false;
  const phoneStr = String(params.phone || '').trim();
  if (phoneStr.includes('@g.us') || (phoneStr.replace(/\D/g, '').length >= 16 && phoneStr.replace(/\D/g, '').startsWith('120363'))) {
    return false;
  }

  const { clientMessage, attendantReply, clientName } = params;
  const reply = (attendantReply || '').trim();
  const clientText = (clientMessage || '').trim();

  if (reply.length < 15) return false; // Mensagens muito curtas ("ok", "sim") não contêm regra/preço

  // Detecta padrões fortes de orçamentos, regras e preços informados pelo atendente
  const temPreco = /(?:R\$\s*\d+|\d+\s*reais|\b\d+,\d{2}\b)/i.test(reply);
  const temPalavraChave = /(?:custa|fica|valor|preço|orçamento|prazo|personalizad|sinal|horário|entrega|retirada)/i.test(reply);

  if (!temPreco && !temPalavraChave) return false;

  // Extrai assunto aproximado a partir da mensagem do cliente ou da resposta
  let titulo = 'Informação de Atendimento';
  let categoria: 'precos' | 'empresa' | 'servicos' | 'geral' = temPreco ? 'precos' : 'geral';
  const cleanClient = clientText.toLowerCase();
  const cleanReply = reply.toLowerCase();

  if (/capacete/i.test(cleanClient) || /capacete/i.test(cleanReply)) {
    titulo = 'Capacetes Personalizados';
    categoria = 'precos';
  } else if (/banner|lona|ilhó/i.test(cleanClient) || /banner|lona/i.test(cleanReply)) {
    titulo = 'Banners e Lonas';
    categoria = 'servicos';
  } else if (/adesivo|perfurado|vinil|recorte|rotulo|rótulo/i.test(cleanClient) || /adesivo|vinil|rótulo|rotulo/i.test(cleanReply)) {
    titulo = 'Adesivos e Rótulos';
    categoria = 'precos';
  } else if (/cartão|cartao|visita/i.test(cleanClient) || /cartão|cartao/i.test(cleanReply)) {
    titulo = 'Cartões de Visita';
    categoria = 'precos';
  } else if (/caneca/i.test(cleanClient) || /caneca/i.test(cleanReply)) {
    titulo = 'Canecas Personalizadas';
    categoria = 'precos';
  } else if (/camisa|camiseta|uniforme|fardamento/i.test(cleanClient) || /camisa|camiseta|uniforme/i.test(cleanReply)) {
    titulo = 'Camisas e Uniformes';
    categoria = 'precos';
  } else if (/copo|taça|taca|long drink|stanley/i.test(cleanClient) || /copo|taça|taca/i.test(cleanReply)) {
    titulo = 'Copos e Taças Personalizados';
    categoria = 'precos';
  } else if (/troféu|trofeu|medalha/i.test(cleanClient) || /troféu|trofeu|medalha/i.test(cleanReply)) {
    titulo = 'Troféus e Medalhas';
    categoria = 'precos';
  } else if (/placa|letreiro|acrílico|acrilico|fachada/i.test(cleanClient) || /placa|acrílico|fachada/i.test(cleanReply)) {
    titulo = 'Placas e Fachadas';
    categoria = 'servicos';
  } else if (/panfleto|folder|flyer|folheto/i.test(cleanClient) || /panfleto|flyer/i.test(cleanReply)) {
    titulo = 'Panfletos e Flyers';
    categoria = 'precos';
  } else if (/brinde|chaveiro|caneta/i.test(cleanClient) || /brinde|chaveiro/i.test(cleanReply)) {
    titulo = 'Brindes e Personalizados';
    categoria = 'precos';
  } else if (/horário|horario|abre|fecha|funcionamento|expediente/i.test(cleanClient) || /horário|horario|funcionamento/i.test(cleanReply)) {
    titulo = 'Horário de Atendimento';
    categoria = 'empresa';
  } else if (/pagamento|pix|cartão|cartao|parcel|sinal|entrada/i.test(cleanClient) || /pagamento|sinal|pix/i.test(cleanReply)) {
    titulo = 'Formas de Pagamento & Sinal';
    categoria = 'empresa';
  } else if (/entrega|frete|motoboy|retirada/i.test(cleanClient) || /entrega|frete|motoboy/i.test(cleanReply)) {
    titulo = 'Entrega & Retirada';
    categoria = 'empresa';
  } else {
    // Limpa expressões comuns de perguntas para extrair o nome do produto/assunto
    const limpo = clientText
      .replace(/^(?:ol[aá]|oi|bom dia|boa tarde|boa noite|opa|por favor|quanto\s+t[aá]|quanto\s+custa|quanto\s+fica|qual\s+o\s+valor|voc[eê]s\s+fazem|tem\s+como\s+fazer|or[cç]amento\s+pra|or[cç]amento\s+para|valor\s+do|valor\s+da|pre[cç]o\s+do|pre[cç]o\s+da)\s+/i, '')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();
    const palavras = limpo.split(/\s+/).slice(0, 4).join(' ');
    if (palavras.length >= 3) {
      titulo = palavras.charAt(0).toUpperCase() + palavras.slice(1);
    }
  }

  // Verifica se já existe um bloco com esse título
  const blocosAtuais = [...getMemoryBlocksSync()];
  const indexExistente = blocosAtuais.findIndex(b => b.title.toLowerCase() === titulo.toLowerCase());

  const novoConteudo = reply;

  if (indexExistente >= 0) {
    // Atualiza o bloco existente com a informação recente
    blocosAtuais[indexExistente] = {
      ...blocosAtuais[indexExistente],
      content: novoConteudo,
      category: categoria,
      source: `Atualizado pelo chat (${clientName || 'Cliente'})`,
      updatedAt: new Date().toISOString(),
    };
  } else {
    // Cria novo bloco de memória
    const novoBloco: RobozinhoMemoryBlock = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: titulo,
      content: novoConteudo,
      category: categoria,
      autoLearned: true,
      source: `Aprendido do chat com ${clientName || 'Cliente'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    blocosAtuais.unshift(novoBloco);
  }

  await salvarBlocosMemoria(blocosAtuais);
  return true;
};
