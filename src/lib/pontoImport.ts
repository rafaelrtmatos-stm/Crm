// Importação incremental do arquivo do relógio de ponto (GLogData_*.txt).
// Funções puras (sem Supabase/React) pra facilitar teste. Tabelas em supabase/create_ponto.sql.
//
// Regras (todas garantidas aqui + pela chave única (funcionario_id, data) do banco):
//  1. O funcionário é identificado pelo ID do relógio (EnNo), nunca só pelo nome.
//  2. NUNCA sobrescreve o passado: dia que já tem registro (importado, corrigido ou criado à mão) fica intacto,
//     e tudo até a data de corte (último dia já importado daquele funcionário) também.
//  3. Só entram dias NOVOS, depois da data de corte. Duplicidade nunca gera registro novo.
//  4. ID sem funcionário cadastrado NÃO cria funcionário: fica "não identificado" até o admin associar.

export interface Marcacao {
  enNo: string; // ID do relógio normalizado (sem zeros à esquerda)
  nome: string; // nome como veio no arquivo (só referência)
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM:SS
}

export interface LeituraArquivo {
  marcacoes: Marcacao[];
  linhasIlegiveis: number;
}

/** ID que o relógio grava quando o usuário não tem cadastro válido (0xFFFF): nunca é de um funcionário. */
export const ID_RELOGIO_INVALIDO = '65535';
/** Batidas do mesmo funcionário com menos que isso entre si são o mesmo toque duplo no leitor. */
export const JANELA_TOQUE_DUPLO_SEG = 120;
/** Datas antes disso são relógio com a data zerada (o arquivo real tem 2000, 2002 e 2004). */
export const ANO_MINIMO = 2020;

/** "000000003" -> "3". Só dígitos; qualquer outra coisa é mantida como veio. */
export function normalizarId(v: string | number | null | undefined): string {
  const s = String(v ?? '').trim();
  if (!/^\d+$/.test(s)) return s;
  return s.replace(/^0+/, '') || '0';
}

/** O arquivo do relógio é UTF-16 (LE, sem BOM); aceita também BOM e UTF-8. */
export function decodificarArquivo(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  if (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xfe) return new TextDecoder('utf-16le').decode(u8.subarray(2));
  if (u8.length >= 2 && u8[0] === 0xfe && u8[1] === 0xff) return new TextDecoder('utf-16be').decode(u8.subarray(2));
  if (u8.length >= 4 && u8[1] === 0 && u8[3] === 0) return new TextDecoder('utf-16le').decode(u8);
  return new TextDecoder('utf-8').decode(u8).replace(/^\uFEFF/, '');
}

// No  Mchn  EnNo  Name  Mode  IOMd  DateTime   (colunas separadas por espaços/tab de largura fixa)
const LINHA = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*?)\s+(\d+)\s+(\d+)\s+(\d{4})[/-](\d{2})[/-](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;

export function lerArquivoRelogio(texto: string): LeituraArquivo {
  const marcacoes: Marcacao[] = [];
  let linhasIlegiveis = 0;
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const linha = bruta.replace(/\0/g, '');
    if (!linha.trim()) continue;
    const m = LINHA.exec(linha);
    if (!m) {
      // Cabeçalho ("No  Mchn  EnNo ...") não conta como erro.
      if (!/^\s*No\s/i.test(linha)) linhasIlegiveis++;
      continue;
    }
    marcacoes.push({
      enNo: normalizarId(m[3]),
      nome: m[4].trim(),
      data: `${m[7]}-${m[8]}-${m[9]}`,
      hora: `${m[10]}:${m[11]}:${m[12]}`,
    });
  }
  return { marcacoes, linhasIlegiveis };
}

function dataValida(data: string, hoje: string): boolean {
  const [y, mo, d] = data.split('-').map(Number);
  if (y < ANO_MINIMO || data > hoje) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const seg = (h: string) => parseInt(h.slice(0, 2), 10) * 3600 + parseInt(h.slice(3, 5), 10) * 60 + parseInt(h.slice(6, 8) || '0', 10);

export interface Batidas {
  entrada: string | null;
  inicio_intervalo: string | null;
  fim_intervalo: string | null;
  saida: string | null;
  observacao: string | null;
}

/**
 * Distribui as batidas do dia (já ordenadas) nos 4 campos do registro.
 * 1 = entrada · 2 = entrada+saída · 3 = entrada+intervalo (saída fica faltando, o dia aparece em Ajustes) · 4 = completo.
 * Mais de 4: primeira = entrada, última = saída, 2ª e 3ª = intervalo, e fica anotado pra conferir.
 */
export function distribuirBatidas(horas: string[]): Batidas {
  const v = (i: number) => horas[i] ?? null;
  const n = horas.length;
  if (n === 1) return { entrada: v(0), inicio_intervalo: null, fim_intervalo: null, saida: null, observacao: null };
  if (n === 2) return { entrada: v(0), inicio_intervalo: null, fim_intervalo: null, saida: v(1), observacao: null };
  if (n === 3)
    return {
      entrada: v(0),
      inicio_intervalo: v(1),
      fim_intervalo: v(2),
      saida: null,
      observacao: 'Importado do relógio com 3 batidas: confira qual está faltando.',
    };
  if (n === 4) return { entrada: v(0), inicio_intervalo: v(1), fim_intervalo: v(2), saida: v(3), observacao: null };
  return {
    entrada: v(0),
    inicio_intervalo: v(1),
    fim_intervalo: v(2),
    saida: v(n - 1),
    observacao: `Importado do relógio com ${n} batidas: confira o intervalo.`,
  };
}

/** Situação de um funcionário já cadastrado, lida do banco antes de importar. */
export interface EstadoFuncionario {
  /** Último dia já importado do relógio (inclui os que o admin corrigiu depois). null = nunca importou. */
  corte: string | null;
  /** Todos os dias que já têm registro (importado, corrigido ou criado à mão): nunca são refeitos. */
  dias: Set<string>;
}

export interface FuncRef {
  id: string;
  numero_relogio: string;
}

export interface DiaImportar extends Batidas {
  funcionario_id: string;
  data: string;
  batidas: number;
}

export interface PlanoId {
  enNo: string;
  nomeArquivo: string;
  funcId: string | null; // null = funcionário não identificado
  marcacoes: number;
  diasNoArquivo: number;
  primeiraData: string;
  ultimaData: string;
  corte: string | null;
  diasNovos: DiaImportar[];
  diasPreservados: number;
}

export interface PlanoImportacao {
  ids: PlanoId[];
  idInvalido: number;
  dataInvalida: number;
  duplicadas: number;
}

const estadoVazio: EstadoFuncionario = { corte: null, dias: new Set() };

/** Monta o que será importado. Não grava nada. */
export function montarPlano(
  marcacoes: Marcacao[],
  funcs: FuncRef[],
  estados: Map<string, EstadoFuncionario>,
  hoje: string
): PlanoImportacao {
  const porNumero = new Map<string, FuncRef>();
  funcs.forEach((f) => porNumero.set(normalizarId(f.numero_relogio), f));

  let idInvalido = 0;
  let dataInvalida = 0;
  let duplicadas = 0;

  // enNo -> data -> horas ; enNo -> contagem de nomes
  const dias = new Map<string, Map<string, string[]>>();
  const nomes = new Map<string, Map<string, number>>();
  const vistas = new Set<string>();

  for (const m of marcacoes) {
    if (m.enNo === ID_RELOGIO_INVALIDO) {
      idInvalido++;
      continue;
    }
    if (!dataValida(m.data, hoje)) {
      dataInvalida++;
      continue;
    }
    const chave = `${m.enNo}|${m.data}|${m.hora}`;
    if (vistas.has(chave)) {
      duplicadas++;
      continue;
    }
    vistas.add(chave);
    if (!dias.has(m.enNo)) dias.set(m.enNo, new Map());
    const d = dias.get(m.enNo)!;
    if (!d.has(m.data)) d.set(m.data, []);
    d.get(m.data)!.push(m.hora);
    if (!nomes.has(m.enNo)) nomes.set(m.enNo, new Map());
    const n = nomes.get(m.enNo)!;
    n.set(m.nome, (n.get(m.nome) || 0) + 1);
  }

  const ids: PlanoId[] = [];
  for (const [enNo, mapaDias] of dias) {
    const func = porNumero.get(enNo) || null;
    const estado = (func && estados.get(func.id)) || estadoVazio;
    const nomeArquivo = [...(nomes.get(enNo) || new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const datas = [...mapaDias.keys()].sort();

    const diasNovos: DiaImportar[] = [];
    let preservados = 0;
    let total = 0;

    for (const data of datas) {
      // Ordena e junta o toque duplo (mesma pessoa batendo duas vezes em seguida).
      const horas = [...mapaDias.get(data)!].sort();
      const limpas: string[] = [];
      for (const h of horas) {
        if (limpas.length && seg(h) - seg(limpas[limpas.length - 1]) <= JANELA_TOQUE_DUPLO_SEG) {
          duplicadas++;
          continue;
        }
        limpas.push(h);
      }
      total += limpas.length;

      if (!func) continue; // não identificado: só conta, não monta registro
      // Passado é intocável: até a data de corte, ou dia que já existe (inclusive corrigido à mão).
      if ((estado.corte !== null && data <= estado.corte) || estado.dias.has(data)) {
        preservados++;
        continue;
      }
      diasNovos.push({ funcionario_id: func.id, data, batidas: limpas.length, ...distribuirBatidas(limpas) });
    }

    ids.push({
      enNo,
      nomeArquivo,
      funcId: func ? func.id : null,
      marcacoes: total,
      diasNoArquivo: datas.length,
      primeiraData: datas[0],
      ultimaData: datas[datas.length - 1],
      corte: func ? estado.corte : null,
      diasNovos,
      diasPreservados: preservados,
    });
  }

  ids.sort((a, b) => (Number(a.enNo) || 0) - (Number(b.enNo) || 0));
  return { ids, idInvalido, dataInvalida, duplicadas };
}

/** De onde veio o registro: distingue importado, corrigido à mão e criado à mão. */
export function rotuloOrigem(r?: { origem?: string; editado_manual?: boolean } | null): string | null {
  if (!r) return null;
  if (r.origem === 'importacao') return r.editado_manual ? 'Corrigido' : 'Relógio';
  return 'Manual';
}
