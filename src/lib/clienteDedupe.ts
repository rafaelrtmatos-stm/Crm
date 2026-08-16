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
