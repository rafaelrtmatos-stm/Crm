import React, { useEffect, useState } from 'react';

// QR Code do PIX gerado AQUI no navegador (biblioteca `qrcode`, ja usada nos PDFs), em vez de baixar a
// imagem de um servico externo (api.qrserver.com). Antes, cada abertura do modal dependia de uma
// requisicao de rede a um site de terceiros -- lenta em conexao ruim e fora do ar sem internet.
// A biblioteca e carregada em segundo plano assim que este arquivo entra no app, entao ao abrir o
// modal ela normalmente ja esta pronta e o QR aparece na hora.
const carregarQrLib = () => import('qrcode').then(m => m.default);
const qrLibPromise = carregarQrLib();

// Guarda o ultimo QR gerado por texto: reabrir o modal com o mesmo valor nao gera de novo.
const cache = new Map<string, string>();

export const PixQrImage = ({ payload, className }: { payload: string; className?: string }) => {
  const [src, setSrc] = useState<string | null>(() => cache.get(payload) ?? null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const emCache = cache.get(payload);
    if (emCache) {
      setSrc(emCache);
      setErro(false);
      return;
    }
    setSrc(null);
    setErro(false);
    qrLibPromise
      .then(QRCode => QRCode.toDataURL(payload, { margin: 1, width: 450, errorCorrectionLevel: 'M' }))
      .then(url => {
        if (cache.size > 30) cache.clear();
        cache.set(payload, url);
        if (!cancelado) setSrc(url);
      })
      .catch(err => {
        console.error('Falha ao gerar o QR Code do PIX:', err);
        if (!cancelado) setErro(true);
      });
    return () => { cancelado = true; };
  }, [payload]);

  if (erro) {
    return <p className="text-[11px] font-bold text-rose-500 text-center px-2">Não foi possível gerar o QR Code. Use o PIX Copia e Cola abaixo.</p>;
  }
  if (!src) {
    return <div className="h-full w-full rounded-xl bg-slate-100 animate-pulse" aria-label="Gerando QR Code" />;
  }
  return <img src={src} alt="QR Code PIX" className={className} />;
};
