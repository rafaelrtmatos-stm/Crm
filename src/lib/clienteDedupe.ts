// Deteccao/mesclagem de clientes duplicados -- usado tanto no cadastro rapido do Terminal de
// Vendas (POSModule) quanto no cadastro do Contatos/Clientes (ContactsModule), ja que sao dois
// formularios separados que gravam na mesma tabela `clientes`.
//
// Regra combinada com o usuario:
// - CPF/CNPJ igual -> mescla automatica, sem perguntar (documento nao se repete entre pessoas).
// - Nome completo igual -> so avisa e pergunta antes de mesclar (pode ser coincidencia de nome,
//   e a mesma pessoa pode legitimamente ter 2 numeros de telefone).

import { supabase } from '../supabase';

export interface ClienteDuplicadoResult {
  cliente: any;
  motivo: 'cpf' | 'nome';
}

/** Procura, no banco, um cliente ja cadastrado com o mesmo CPF/CNPJ ou o mesmo nome completo. */
export async function buscarClienteDuplicado(params: {
  fullName: string;
  cpfCnpj?: string | null;
  excludeId?: string;
}): Promise<ClienteDuplicadoResult | null> {
  const nome = params.fullName.trim();
  const doc = (params.cpfCnpj || '').trim();

  if (doc) {
    let query = supabase.from('clientes').select('*').eq('cpf_cnpj', doc).limit(1);
    if (params.excludeId) query = query.neq('id', params.excludeId);
    const { data } = await query;
    if (data && data.length > 0) return { cliente: data[0], motivo: 'cpf' };
  }
  if (nome) {
    let query = supabase.from('clientes').select('*').ilike('full_name', nome).limit(1);
    if (params.excludeId) query = query.neq('id', params.excludeId);
    const { data } = await query;
    if (data && data.length > 0) return { cliente: data[0], motivo: 'nome' };
  }
  return null;
}

/**
 * Monta o payload de UPDATE pra mesclar os dados novos dentro do cadastro ja existente, sem
 * apagar nada que ja estava preenchido -- so completa o que estava em branco. O telefone e'
 * tratado a parte: um numero novo diferente do principal vira "telefone alternativo" em vez de
 * sobrescrever o principal.
 */
export function montarPayloadMesclagem(existente: any, novo: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = {};
  const camposSimples = ['email', 'cep', 'numero', 'logradouro', 'distrito', 'nascimento', 'rg', 'city', 'state', 'complemento', 'notes', 'cpf_cnpj'];
  camposSimples.forEach((campo) => {
    if (!existente[campo] && novo[campo]) payload[campo] = novo[campo];
  });
  if (!existente.limite_credito && novo.limite_credito) payload.limite_credito = novo.limite_credito;
  if (Array.isArray(novo.patrimonios) && novo.patrimonios.length) {
    const propsExistentes = (existente.patrimonios || []).map((p: any) => p.propriedade);
    const novosUnicos = novo.patrimonios.filter((p: any) => !propsExistentes.includes(p.propriedade));
    if (novosUnicos.length) payload.patrimonios = [...(existente.patrimonios || []), ...novosUnicos];
  }
  if (novo.phone) {
    if (!existente.phone) {
      payload.phone = novo.phone;
    } else if (novo.phone !== existente.phone && novo.phone !== existente.telefone_alternativo) {
      payload.telefone_alternativo = novo.phone;
    }
  }
  return payload;
}

// --- Mesclagem em lote (tela "Mesclar Duplicados" em Contatos/Clientes) ---

export interface GrupoDuplicado {
  chave: string;
  motivo: 'cpf' | 'nome';
  clientes: any[];
}

const normalizarNome = (nome: string) => (nome || '').trim().replace(/\s+/g, ' ').toUpperCase();

/**
 * Agrupa a lista de clientes em duplicatas: `porCpf` (mesmo CPF/CNPJ, documento nao se repete
 * entre pessoas -> seguro pra mesclar automatico) e `porNome` (mesmo nome completo, pode ser
 * coincidencia -> precisa revisar um por um). Grupos de nome cujos membros ja sao exatamente os
 * mesmos de um grupo de CPF nao aparecem duplicados em porNome.
 */
export function agruparDuplicados(clientes: any[]): { porCpf: GrupoDuplicado[]; porNome: GrupoDuplicado[] } {
  const porCpfMap = new Map<string, any[]>();
  clientes.forEach((c) => {
    const doc = (c.cpf_cnpj || '').replace(/\D/g, '');
    if (!doc) return;
    if (!porCpfMap.has(doc)) porCpfMap.set(doc, []);
    porCpfMap.get(doc)!.push(c);
  });
  const porCpf: GrupoDuplicado[] = [...porCpfMap.entries()]
    .filter(([, grupo]) => grupo.length > 1)
    .map(([chave, grupo]) => ({ chave, motivo: 'cpf' as const, clientes: grupo }));

  const idsJaEmCpf = new Set(porCpf.flatMap((g) => g.clientes.map((c) => c.id)));

  const porNomeMap = new Map<string, any[]>();
  clientes.forEach((c) => {
    const nome = normalizarNome(c.full_name);
    if (!nome) return;
    if (!porNomeMap.has(nome)) porNomeMap.set(nome, []);
    porNomeMap.get(nome)!.push(c);
  });
  const porNome: GrupoDuplicado[] = [...porNomeMap.entries()]
    .filter(([, grupo]) => grupo.length > 1 && !grupo.every((c) => idsJaEmCpf.has(c.id)))
    .map(([chave, grupo]) => ({ chave, motivo: 'nome' as const, clientes: grupo }));

  return { porCpf, porNome };
}

/** Escolhe automaticamente qual cadastro do grupo vira o "principal": o com mais campos preenchidos e, empatando, o mais antigo. */
export function escolherPrincipalSugerido(grupo: any[]): any {
  const camposPeso = ['cep', 'numero', 'logradouro', 'distrito', 'nascimento', 'rg', 'complemento', 'notes', 'limite_credito', 'email', 'phone'];
  return grupo.slice().sort((a, b) => {
    const preenchidos = (c: any) => camposPeso.filter((campo) => !!c[campo]).length;
    const diff = preenchidos(b) - preenchidos(a);
    if (diff !== 0) return diff;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  })[0];
}

/**
 * Mescla os `duplicataIds` dentro do cadastro `primaryId`: preenche no principal qualquer campo
 * que estava em branco (sem apagar nada que ja existia nele), reaponta pra ele o historico que
 * estava vinculado as duplicatas (vendas, conversas, contratos, orcamentos) pra nao perder nada,
 * e por fim apaga os cadastros duplicados.
 */
export async function mesclarClientes(primaryId: string, duplicataIds: string[]): Promise<void> {
  const idsUnicos = duplicataIds.filter((id) => id && id !== primaryId);
  if (idsUnicos.length === 0) return;

  const { data: todos, error: fetchError } = await supabase.from('clientes').select('*').in('id', [primaryId, ...idsUnicos]);
  if (fetchError) throw fetchError;
  let atual = (todos || []).find((c: any) => c.id === primaryId);
  if (!atual) throw new Error('Cliente principal não encontrado.');

  for (const dupId of idsUnicos) {
    const dup = (todos || []).find((c: any) => c.id === dupId);
    if (!dup) continue;
    const payload = montarPayloadMesclagem(atual, dup);
    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', primaryId);
      if (error) throw error;
      atual = { ...atual, ...payload };
    }
  }

  // Reaponta o historico vinculado as duplicatas pro cadastro principal, pra nao perder vendas,
  // contratos, orcamentos e conversas que apontavam pro cliente que vai ser apagado.
  for (const tabela of ['vendas', 'conversas', 'contratos', 'orcamentos']) {
    for (const dupId of idsUnicos) {
      await supabase.from(tabela).update({ cliente_id: primaryId }).eq('cliente_id', dupId);
    }
  }

  const { error: deleteError } = await supabase.from('clientes').delete().in('id', idsUnicos);
  if (deleteError) throw deleteError;
}
