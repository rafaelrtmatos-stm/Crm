import React, { Suspense, useEffect } from 'react';
import App from './App';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      const component = await factory();
      sessionStorage.removeItem('chunk_retry_attempt');
      return component;
    } catch (firstErr) {
      console.warn('Primeira tentativa de importar módulo falhou, tentando novamente...', firstErr);
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const component = await factory();
        sessionStorage.removeItem('chunk_retry_attempt');
        return component;
      } catch (error: any) {
        console.warn('Erro ao importar script de módulo dinâmico, tentando recarregar:', error);
        const hasRetried = sessionStorage.getItem('chunk_retry_attempt');
        if (!hasRetried && typeof window !== 'undefined') {
          sessionStorage.setItem('chunk_retry_attempt', 'true');
          window.location.reload();
        }
        throw error;
      }
    }
  });
}

const ComissoesApp = lazyWithRetry(() => import('./comissoes/ComissoesApp'));
const ContractSignaturePublicPage = lazyWithRetry(() => import('./components/ContractSignaturePublicPage'));
const ContractValidationPage = lazyWithRetry(() => import('./components/ContractValidationPage'));
const PagamentoPublicPage = lazyWithRetry(() => import('./components/PagamentoPublicPage'));

// Decide qual "site" mostrar com base na URL, ANTES de qualquer hook do App/ComissoesApp
// ser chamado — evita violar as regras de hooks do React (early return dentro do proprio
// componente que ja tem hooks quebraria a ordem de chamada entre renders).
export default function AppRoot() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  const isComissoesRoute = path === '/comissoes';
  // Tela publica de assinatura digital de contrato (link enviado manualmente ao cliente)
  const isAssinaturaRoute = /^\/assinar\/[a-zA-Z0-9-]+$/.test(path);
  // Tela publica de validacao de assinatura (codigo ou upload de PDF) -- ver ContractValidationPage.tsx
  const isValidacaoRoute = path === '/validar';
  // Tela publica do link de pagamento PIX enviado ao cliente (/pagar/:token) -- ver PagamentoPublicPage.tsx
  const isPagamentoRoute = /^\/pagar\/[0-9a-fA-F]{32}$/.test(path);

  // O CRM principal trava html/body/#root (overflow hidden + position fixed) pra se
  // comportar como app nativo, sem arrastar a pagina. A tela de Comissoes e a tela publica
  // de assinatura, porem, sao paginas normais que crescem com o conteudo e dependem do
  // scroll padrao da pagina. Por isso marcamos o <html> com essa classe nessas rotas, pra
  // liberar a rolagem (ver index.css) -- sem isso, so a caixinha do texto do contrato
  // (que tem overflow-y-auto proprio) rola, e o resto da tela (checkbox, verificacao de
  // CPF/CNPJ, codigo, botao de assinar) fica inacessivel se nao couber na tela do celular.
  useEffect(() => {
    document.documentElement.classList.toggle('scrollable-route', isComissoesRoute || isAssinaturaRoute || isValidacaoRoute || isPagamentoRoute);
    return () => document.documentElement.classList.remove('scrollable-route');
  }, [isComissoesRoute, isAssinaturaRoute, isValidacaoRoute, isPagamentoRoute]);

  if (isAssinaturaRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <ContractSignaturePublicPage />
      </Suspense>
    );
  }

  if (isPagamentoRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <PagamentoPublicPage />
      </Suspense>
    );
  }

  if (isValidacaoRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <ContractValidationPage />
      </Suspense>
    );
  }

  if (isComissoesRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <ComissoesApp />
      </Suspense>
    );
  }

  return <App />;
}
