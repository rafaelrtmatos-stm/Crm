import React, { Suspense, useEffect } from 'react';
import App from './App';

const ComissoesApp = React.lazy(() => import('./comissoes/ComissoesApp'));
const ContractSignaturePublicPage = React.lazy(() => import('./components/ContractSignaturePublicPage'));

// Decide qual "site" mostrar com base na URL, ANTES de qualquer hook do App/ComissoesApp
// ser chamado — evita violar as regras de hooks do React (early return dentro do proprio
// componente que ja tem hooks quebraria a ordem de chamada entre renders).
export default function AppRoot() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  const isComissoesRoute = path === '/comissoes';
  // Tela publica de assinatura digital de contrato (link enviado manualmente ao cliente)
  const isAssinaturaRoute = /^\/assinar\/[a-zA-Z0-9-]+$/.test(path);

  // O CRM principal trava html/body/#root (overflow hidden + position fixed) pra se
  // comportar como app nativo, sem arrastar a pagina. A tela de Comissoes e a tela publica
  // de assinatura, porem, sao paginas normais que crescem com o conteudo e dependem do
  // scroll padrao da pagina. Por isso marcamos o <html> com essa classe nessas rotas, pra
  // liberar a rolagem (ver index.css) -- sem isso, so a caixinha do texto do contrato
  // (que tem overflow-y-auto proprio) rola, e o resto da tela (checkbox, verificacao de
  // CPF/CNPJ, codigo, botao de assinar) fica inacessivel se nao couber na tela do celular.
  useEffect(() => {
    document.documentElement.classList.toggle('scrollable-route', isComissoesRoute || isAssinaturaRoute);
    return () => document.documentElement.classList.remove('scrollable-route');
  }, [isComissoesRoute, isAssinaturaRoute]);

  if (isAssinaturaRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <ContractSignaturePublicPage />
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
