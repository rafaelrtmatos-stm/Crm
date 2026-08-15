// Busca de CEP usando a API publica do ViaCEP (https://viacep.com.br).
// Suporta busca por CEP direto e busca por UF + Cidade + Rua (quando o cliente
// nao sabe o CEP, so o endereco).

export interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;
  complemento?: string;
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

export type Uf = typeof UFS[number];

export const UF_OPTIONS = UFS;

/** Busca endereco a partir do CEP (formato livre: com ou sem traco). */
export async function searchAddressByCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos.');
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) throw new Error('Não foi possível consultar o CEP agora.');

  const data = await response.json();
  if (data.erro) return null;

  return {
    cep: data.cep,
    logradouro: data.logradouro,
    bairro: data.bairro,
    localidade: data.localidade,
    uf: data.uf,
    complemento: data.complemento || undefined,
  };
}

/**
 * Busca o(s) CEP(s) a partir do nome da rua, quando o cliente sabe o endereco mas nao sabe o
 * CEP. Exige UF + Cidade + pelo menos parte do nome da rua (minimo 3 caracteres, exigencia da
 * propria API). Retorna todas as ruas que combinarem (pode ser mais de uma).
 */
export async function searchCepByStreet(uf: string, cidade: string, rua: string): Promise<CepResult[]> {
  const ufTrim = uf.trim().toUpperCase();
  const cidadeTrim = cidade.trim();
  const ruaTrim = rua.trim();

  if (ufTrim.length !== 2) throw new Error('Selecione o estado (UF).');
  if (cidadeTrim.length < 2) throw new Error('Informe a cidade.');
  if (ruaTrim.length < 3) throw new Error('Informe pelo menos 3 letras do nome da rua.');

  const url = `https://viacep.com.br/ws/${encodeURIComponent(ufTrim)}/${encodeURIComponent(cidadeTrim)}/${encodeURIComponent(ruaTrim)}/json/`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível buscar o CEP agora. Tente novamente.');

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return [];

  return data.map((item: any) => ({
    cep: item.cep,
    logradouro: item.logradouro,
    bairro: item.bairro,
    localidade: item.localidade,
    uf: item.uf,
    complemento: item.complemento || undefined,
  }));
}

/** Monta a string final de endereco (o campo usado no contrato) a partir de um resultado + numero. */
export function formatFullAddress(result: CepResult, numero?: string, complementoExtra?: string): string {
  const partes = [
    `${result.logradouro}${numero ? `, nº ${numero}` : ', nº ____'}`,
    complementoExtra || result.complemento,
    result.bairro,
    `${result.localidade} - ${result.uf}`,
    `CEP: ${result.cep}`,
  ].filter(Boolean);

  return partes.join(', ');
}
