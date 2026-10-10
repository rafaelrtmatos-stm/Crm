import React from 'react';

// Transforma URLs (http://, https:// ou www.) dentro do texto de uma mensagem em links clicaveis.
// Devolve nos React (strings + <a>), entao o texto continua sendo renderizado como texto puro --
// nada de dangerouslySetInnerHTML. Apenas http/https sao aceitos (nunca javascript:, data: etc.).
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+/gi;

// Pontuacao que costuma vir colada no fim da URL ("veja https://x.com/a.") e nao faz parte dela.
const PONTUACAO_FINAL = /[.,;:!?'"»”’)\]}]+$/;

function separarPontuacaoFinal(url: string): [string, string] {
  let limpa = url;
  let resto = '';
  while (PONTUACAO_FINAL.test(limpa)) {
    const ultimo = limpa[limpa.length - 1];
    // Mantem o ")" se a URL tem o "(" correspondente (ex.: wikipedia.org/wiki/Foo_(bar))
    if (ultimo === ')' && (limpa.match(/\(/g) || []).length >= (limpa.match(/\)/g) || []).length) break;
    limpa = limpa.slice(0, -1);
    resto = ultimo + resto;
  }
  return [limpa, resto];
}

export function textoComLinks(texto: string | null | undefined, className = 'text-blue-600 underline underline-offset-2 hover:text-blue-800 break-all'): React.ReactNode {
  if (!texto) return texto ?? null;
  const partes: React.ReactNode[] = [];
  let ultimoIndice = 0;
  let chave = 0;
  for (const achado of texto.matchAll(URL_REGEX)) {
    const inicio = achado.index ?? 0;
    const [url, sobra] = separarPontuacaoFinal(achado[0]);
    if (!url || /^(?:https?:\/\/|www\.)$/i.test(url)) continue;
    if (inicio > ultimoIndice) partes.push(texto.slice(ultimoIndice, inicio));
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    partes.push(
      <a
        key={`lnk-${chave++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        // Nao deixa o clique no link disparar acoes da bolha/legenda (ex.: abrir a imagem ampliada)
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    if (sobra) partes.push(sobra);
    ultimoIndice = inicio + achado[0].length;
  }
  if (partes.length === 0) return texto;
  if (ultimoIndice < texto.length) partes.push(texto.slice(ultimoIndice));
  return <>{partes}</>;
}
