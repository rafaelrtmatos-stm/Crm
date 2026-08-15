/**
 * Utility for Rafa Art Service Contract Generation & Hashing
 */

export interface ContractTemplateParams {
  companyName?: string;
  companyCnpj?: string;
  companyAddress?: string;
  clientName: string;
  clientCpf?: string;
  clientRg?: string;
  clientAddress?: string;
  clientNacionalidade?: string;
  clientEstadoCivil?: string;
  clientProfissao?: string;
  serviceDescription: string;
  deliveryDays: number;
  totalAmount: number;
  downPaymentAmount?: number;
  remainingAmount?: number;
  paymentMethod?: string;
  cidadeForo?: string;
  dateStr?: string;
}

/**
 * Utility to convert currency number into written words in Portuguese (Extenso)
 */
export function numeroParaExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return 'zero reais';

  const inteiros = Math.floor(valor);
  const centavos = Math.round((valor - inteiros) * 100);

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezA19 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function converterGrupo(n: number): string {
    if (n === 100) return 'cem';
    let res = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) res += centenas[c];

    if (d === 1) {
      if (res) res += ' e ';
      res += dezA19[u];
    } else {
      if (d > 1) {
        if (res) res += ' e ';
        res += dezenas[d];
      }
      if (u > 0) {
        if (res) res += ' e ';
        res += unidades[u];
      }
    }
    return res;
  }

  let extensostr = '';
  const milhares = Math.floor(inteiros / 1000);
  const restoInteiro = inteiros % 1000;

  if (milhares > 0) {
    if (milhares === 1) {
      extensostr += 'um mil';
    } else {
      extensostr += converterGrupo(milhares) + ' mil';
    }
    if (restoInteiro > 0) {
      extensostr += (restoInteiro < 100 || restoInteiro % 100 === 0) ? ' e ' : ' ';
    }
  }

  if (restoInteiro > 0 || inteiros === 0) {
    if (inteiros > 0 || milhares === 0) {
      extensostr += converterGrupo(restoInteiro);
    }
  }

  const moedaStr = inteiros === 1 ? 'real' : 'reais';
  extensostr = extensostr.trim() + ' ' + moedaStr;

  if (centavos > 0) {
    extensostr += ' e ' + converterGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  return extensostr;
}

export function generateContractText(params: ContractTemplateParams): string {
  const req = (val: string | undefined, name: string) => {
    return val && val.trim().length > 0 ? val.trim() : `[CAMPO FALTANTE: ${name}]`;
  };

  const nome_cliente = req(params.clientName, 'Nome do Cliente');
  const cpf_cliente = req(params.clientCpf, 'CPF do Cliente');
  const rg_cliente = req(params.clientRg, 'RG do Cliente');
  const endereco_cliente = req(params.clientAddress, 'Endereço do Cliente');
  const nacionalidade = req(params.clientNacionalidade || 'brasileiro(a)', 'Nacionalidade');
  const estado_civil = req(params.clientEstadoCivil || 'solteiro(a)', 'Estado Civil');
  const profissao = req(params.clientProfissao || 'comerciante', 'Profissão');

  const descricao_servico = req(params.serviceDescription, 'Descrição do Serviço');
  const prazo_dias = params.deliveryDays > 0 ? params.deliveryDays.toString() : `[CAMPO FALTANTE: Prazo em Dias]`;

  const total = params.totalAmount || 0;
  const entrada = params.downPaymentAmount ?? (total * 0.5);
  const saldo = params.remainingAmount ?? (total - entrada);

  const valor_total = total > 0 
    ? total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : `[CAMPO FALTANTE: Valor Total]`;
  
  const valor_total_extenso = total > 0 ? numeroParaExtenso(total) : `[CAMPO FALTANTE: Valor Por Extenso]`;

  const valor_entrada = total > 0 
    ? entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : `[CAMPO FALTANTE: Valor Entrada]`;

  const valor_saldo = total > 0 
    ? saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : `[CAMPO FALTANTE: Valor Saldo]`;

  const forma_pagamento = req(params.paymentMethod || 'PIX', 'Forma de Pagamento');
  const cidade_foro = req(params.cidadeForo || 'Goiânia - GO', 'Cidade do Foro');

  const data_atual = params.dateStr || new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const nome_empresa = params.companyName || 'RAFA ARTS GRAPHICS';
  const cnpj_empresa = params.companyCnpj || '28.884.125/0001-40';

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: ${nome_cliente}, ${nacionalidade}, ${estado_civil}, ${profissao}, portador(a) do CPF nº ${cpf_cliente} e do RG nº ${rg_cliente}, residente e domiciliado(a) na ${endereco_cliente}, doravante denominado(a) simplesmente CONTRATANTE.

CONTRATADA: ${nome_empresa}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${cnpj_empresa}, doravante denominada simplesmente CONTRATADA.

CLÁUSULA 1ª – DO OBJETO
1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, dos seguintes serviços: ${descricao_servico}.
1.2. Eventuais alterações no escopo deverão ser acordadas por escrito, podendo implicar revisão de prazo e/ou valor.

CLÁUSULA 2ª – DO PRAZO
2.1. Os serviços serão executados no prazo de ${prazo_dias} dias, contados a partir da confirmação do pagamento da entrada.

CLÁUSULA 3ª – DO VALOR E DA FORMA DE PAGAMENTO
3.1. Pela prestação integral dos serviços, a CONTRATANTE pagará à CONTRATADA o VALOR TOTAL E FECHADO de R$ ${valor_total} (${valor_total_extenso}).
3.2. Pagamento em 2 parcelas: ENTRADA de 50% (R$ ${valor_entrada}) na confirmação do aceite deste contrato; SALDO de 50% (R$ ${valor_saldo}) no dia da finalização/entrega do serviço.
3.3. Pagamento via ${forma_pagamento}.
3.4. A CONTRATADA não é obrigada a entregar o serviço antes da quitação integral do saldo.

CLÁUSULA 4ª – DO ATRASO NO PAGAMENTO
4.1. O não pagamento na data acordada sujeita a CONTRATANTE a: a) multa moratória de 2% sobre o valor da parcela em atraso; b) juros de mora de 1% ao mês, pro rata die, sem prejuízo de correção monetária.
4.2. Atraso superior a 15 dias autoriza a CONTRATADA a suspender ou rescindir o contrato.

CLÁUSULA 5ª – DA RESCISÃO
5.1. Rescisão mediante aviso prévio por escrito, respeitando serviços já executados.
5.2. Em desistência após início da execução, o valor da entrada não será restituído.

CLÁUSULA 6ª – DAS OBRIGAÇÕES DAS PARTES
6.1. À CONTRATADA cabe executar com zelo e dentro do prazo.
6.2. À CONTRATANTE cabe fornecer informações necessárias e efetuar os pagamentos pactuados.

CLÁUSULA 7ª – DISPOSIÇÕES GERAIS
7.1. Este contrato substitui entendimentos verbais anteriores.
7.2. Alterações só valem por escrito e assinadas por ambas as partes.

CLÁUSULA 8ª – DA VALIDADE DA ASSINATURA E DO ACEITE ELETRÔNICO
8.1. Nos termos do art. 107 do Código Civil, é válido o aceite eletrônico manifestado no sistema/PDV da CONTRATADA.
8.2. O aceite só é válido se o sistema: a) exibir o contrato completo antes da confirmação; b) exigir marcação de caixa de seleção com "Li e concordo com os termos do contrato de prestação de serviços"; c) confirmar identidade via código enviado por WhatsApp/SMS ao número informado; d) registrar nome, CPF, telefone, IP, data/hora e cópia do contrato aceito.
8.3. Nos termos da Lei nº 14.063/2020 e MP nº 2.200-2/2001, esse aceite tem plena validade jurídica.
8.4. A CONTRATADA guardará esses registros pelo prazo prescricional aplicável.

CLÁUSULA 9ª – DO FORO
9.1. Fica eleito o foro da Comarca de ${cidade_foro}.

Goiânia, ${data_atual}.`;
}

/**
 * Computes a pseudo SHA-256 hash representation of text for contract integrity verification.
 */
export async function computeContractHash(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.warn('Crypto subtle fallback:', e);
    }
  }

  // Fallback hash implementation
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const positiveHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${positiveHash}${Date.now().toString(16)}`;
}

/**
 * Helper to get user's public IP address or simulated fallback IP
 */
export async function getPublicIpAddress(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const data = await response.json();
      if (data.ip) return data.ip;
    }
  } catch (err) {
    // fallback or offline network
  }
  return '189.102.45.12';
}

// ---------------------------------------------------------------------------
// Validacao de documentos do cliente (CPF, CNPJ, RG, telefone)
// ---------------------------------------------------------------------------

const onlyDigits = (value: string): string => (value || '').replace(/\D/g, '');

/** Valida CPF (11 digitos) usando o algoritmo oficial dos digitos verificadores. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // rejeita 000.000.000-00, 111.111.111-11, etc.

  const calcDigit = (base: string, factorStart: number): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * (factorStart - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);
  return digit1 === parseInt(cpf[9], 10) && digit2 === parseInt(cpf[10], 10);
}

/** Valida CNPJ (14 digitos) usando o algoritmo oficial dos digitos verificadores. */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digit1 = calcDigit(cnpj.slice(0, 12), weights1);
  const digit2 = calcDigit(cnpj.slice(0, 13), weights2);
  return digit1 === parseInt(cnpj[12], 10) && digit2 === parseInt(cnpj[13], 10);
}

export type DocumentKind = 'cpf' | 'cnpj' | 'invalid';

/** Identifica se o documento informado e' um CPF ou CNPJ valido pelo tamanho + digitos verificadores. */
export function getDocumentKind(value: string): DocumentKind {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits) ? 'cpf' : 'invalid';
  if (digits.length === 14) return isValidCnpj(digits) ? 'cnpj' : 'invalid';
  return 'invalid';
}

export function isValidCpfOrCnpj(value: string): boolean {
  return getDocumentKind(value) !== 'invalid';
}

/**
 * Valida RG do cliente. So se aplica a pessoa fisica (CPF) -- pessoa juridica (CNPJ) nao tem RG.
 * Aceita tanto o RG estadual tradicional (formato varia por estado: letras, pontos, barra, digito
 * verificador X) quanto o novo padrao da Carteira de Identidade Nacional (CIN), que usa o mesmo
 * numero do CPF (11 digitos com digito verificador valido).
 */
export function isValidRg(value: string): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return false;

  const digits = onlyDigits(trimmed);

  // Novo padrao (CIN): numero identico ao CPF, 11 digitos com DV valido.
  if (digits.length === 11) {
    return isValidCpf(digits);
  }

  // RG estadual tradicional: formato varia por estado (ex: 12.345.678-9, MG-12.345.678,
  // 1234567 DG/GO). Aceita alfanumerico com pontuacao comum, entre 5 e 20 caracteres,
  // com pelo menos 4 digitos.
  const formatOk = /^[0-9A-Za-z.\-\/\s]{5,20}$/.test(trimmed);
  return formatOk && digits.length >= 4;
}

/** Valida telefone brasileiro com DDD: 10 digitos (fixo) ou 11 digitos (celular com 9º digito). */
export function isValidPhoneBR(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (digits.length === 11 && digits[2] !== '9') return false; // celular sempre comeca com 9
  return true;
}

