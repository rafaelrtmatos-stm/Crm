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
  motivo: 'cpf' | 'nome' | 'phone';
}

/**
 * Localiza cliente existente pelo final do telefone (últimos 8 dígitos).
 * Trata variações de formatação: +55, DDD, traços, espaços, parênteses e 9º dígito.
 */
export async function buscarClientePorTelefone(phoneRaw: string): Promise<any | null> {
  const digitos = (phoneRaw || '').replace(/\D/g, '');
  if (!digitos || digitos.length < 6) return null;
  const ultimos8 = digitos.slice(-8);
  const p1 = ultimos8.slice(0, 4);
  const p2 = ultimos8.slice(4);
  const ultimos4 = digitos.slice(-4);

  // Consulta por or no Supabase cobrindo substring com e sem traço/espaço
  const orFilters = [
    `phone.ilike.%${ultimos8}%`,
    `phone.ilike.%${p1}-${p2}%`,
    `phone.ilike.%${p1} ${p2}%`,
    `telefone_alternativo.ilike.%${ultimos8}%`,
    `telefone_alternativo.ilike.%${p1}-${p2}%`,
    `telefone_alternativo.ilike.%${p1} ${p2}%`,
    `phone.ilike.%${ultimos4}%`,
    `telefone_alternativo.ilike.%${ultimos4}%`,
  ].join(',');

  try {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .or(orFilters)
      .limit(30);

    if (data && data.length > 0) {
      // 1. Match exato nos últimos 8 dígitos (desconsiderando caracteres não numéricos)
      const exactMatch = data.find((c: any) => {
        const dPhone = (c.phone || '').replace(/\D/g, '');
        const dAlt = (c.telefone_alternativo || '').replace(/\D/g, '');
        return (dPhone.length >= 8 && dPhone.slice(-8) === ultimos8) ||
               (dAlt.length >= 8 && dAlt.slice(-8) === ultimos8);
      });
      if (exactMatch) return exactMatch;

      // 2. Se a entrada tem 9 dígitos (ex.: 991234567), tenta os 8 dígitos após o 9
      if (digitos.length >= 9) {
        const ultimos9 = digitos.slice(-9);
        const semNono = ultimos9.slice(1);
        const matchSemNono = data.find((c: any) => {
          const dPhone = (c.phone || '').replace(/\D/g, '');
          const dAlt = (c.telefone_alternativo || '').replace(/\D/g, '');
          return (dPhone.length >= 8 && dPhone.slice(-8) === semNono) ||
                 (dAlt.length >= 8 && dAlt.slice(-8) === semNono);
        });
        if (matchSemNono) return matchSemNono;
      }

      // 3. Fallback: se os dígitos finais conferem
      const fallback = data.find((c: any) => {
        const dPhone = (c.phone || '').replace(/\D/g, '');
        const dAlt = (c.telefone_alternativo || '').replace(/\D/g, '');
        return (dPhone.length >= 6 && (dPhone.endsWith(ultimos8) || ultimos8.endsWith(dPhone))) ||
               (dAlt.length >= 6 && (dAlt.endsWith(ultimos8) || ultimos8.endsWith(dAlt)));
      });
      if (fallback) return fallback;
    }
  } catch (err) {
    console.error('Erro ao buscar cliente por telefone (8 dígitos):', err);
  }
  return null;
}

/** Procura, no banco, um cliente ja cadastrado com o mesmo CPF/CNPJ, mesmo telefone (8 dígitos) ou o mesmo nome completo. */
export async function buscarClienteDuplicado(params: {
  fullName: string;
  cpfCnpj?: string | null;
  phone?: string | null;
  excludeId?: string;
}): Promise<ClienteDuplicadoResult | null> {
  const nome = params.fullName.trim();
  const doc = (params.cpfCnpj || '').trim();
  const phone = (params.phone || '').trim();

  if (doc) {
    let query = supabase.from('clientes').select('*').eq('cpf_cnpj', doc).limit(1);
    if (params.excludeId) query = query.neq('id', params.excludeId);
    const { data } = await query;
    if (data && data.length > 0) return { cliente: data[0], motivo: 'cpf' };
  }
  if (phone) {
    const porTel = await buscarClientePorTelefone(phone);
    if (porTel && (!params.excludeId || porTel.id !== params.excludeId)) {
      return { cliente: porTel, motivo: 'phone' };
    }
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
