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
  // comportar como app nativo, sem arrastar a pagina. A tela de Comissoes, porem, e uma
  // pagina normal que cresce com o conteudo e depende do scroll padrao da pagina. Por isso
  // marcamos o <html> com essa classe so nessa rota, pra liberar a rolagem (ver index.css).
  useEffect(() => {
    document.documentElement.classList.toggle('comissoes-route', isComissoesRoute);
    return () => document.documentElement.classList.remove('comissoes-route');
  }, [isComissoesRoute]);

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
