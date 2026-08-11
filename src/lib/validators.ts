// Validação de CPF (algoritmo oficial de dígito verificador) e CNPJ, e formatação de telefone BR

export function validateCPF(cpfRaw: string): boolean {
  const cpf = cpfRaw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os digitos iguais (000.000.000-00 etc) nao e valido

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[10])) return false;

  return true;
}

export function validateCNPJ(cnpjRaw: string): boolean {
  const cnpj = cnpjRaw.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigito = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((acc, digito, i) => acc + parseInt(digito) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const digito1 = calcDigito(cnpj.substring(0, 12), pesos1);
  if (digito1 !== parseInt(cnpj[12])) return false;
  const digito2 = calcDigito(cnpj.substring(0, 13), pesos2);
  if (digito2 !== parseInt(cnpj[13])) return false;

  return true;
}

// Valida CPF ou CNPJ dependendo da quantidade de digitos. Campo vazio conta como valido
// (obrigatoriedade e responsabilidade de quem usa, aqui so valida o formato/digito verificador)
export function validateCpfCnpj(value: string): { valid: boolean; tipo: 'cpf' | 'cnpj' | null } {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return { valid: true, tipo: null };
  if (digits.length <= 11) return { valid: validateCPF(digits), tipo: 'cpf' };
  return { valid: validateCNPJ(digits), tipo: 'cnpj' };
}

// RG nao tem digito verificador padronizado nacionalmente (cada estado tem sua propria regra,
// so SP usa modulo 11) — aqui so faz uma checagem basica de tamanho plausivel (a maioria dos
// estados usa entre 7 e 9 digitos, fora o digito verificador quando existe)
export function looksLikeValidRG(rgRaw: string): boolean {
  const digits = rgRaw.replace(/[^\dXx]/g, '');
  return digits.length >= 7 && digits.length <= 10;
}

export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// Formata telefone BR (fixo 8 digitos ou celular 9 digitos) com DDD: (93) 99211-2108 / (93) 3212-1234
export function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
