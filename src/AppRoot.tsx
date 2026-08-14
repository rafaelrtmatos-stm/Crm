import React, { Suspense, useEffect } from 'react';
import App from './App';

const ComissoesApp = React.lazy(() => import('./comissoes/ComissoesApp'));

// Decide qual "site" mostrar com base na URL, ANTES de qualquer hook do App/ComissoesApp
// ser chamado — evita violar as regras de hooks do React (early return dentro do proprio
// componente que ja tem hooks quebraria a ordem de chamada entre renders).
export default function AppRoot() {
  const isComissoesRoute = typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/comissoes';

  // O CRM principal trava html/body/#root (overflow hidden + position fixed) pra se
  // comportar como app nativo, sem arrastar a pagina. A tela de Comissoes, porem, e uma
  // pagina normal que cresce com o conteudo e depende do scroll padrao da pagina. Por isso
  // marcamos o <html> com essa classe so nessa rota, pra liberar a rolagem (ver index.css).
  useEffect(() => {
    document.documentElement.classList.toggle('comissoes-route', isComissoesRoute);
    return () => document.documentElement.classList.remove('comissoes-route');
  }, [isComissoesRoute]);

  if (isComissoesRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#0B0B0B]" />}>
        <ComissoesApp />
      </Suspense>
    );
  }

  return <App />;
}
