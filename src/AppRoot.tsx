import React, { Suspense } from 'react';
import App from './App';

const ComissoesApp = React.lazy(() => import('./comissoes/ComissoesApp'));

// Decide qual "site" mostrar com base na URL, ANTES de qualquer hook do App/ComissoesApp
// ser chamado — evita violar as regras de hooks do React (early return dentro do proprio
// componente que ja tem hooks quebraria a ordem de chamada entre renders).
export default function AppRoot() {
  const isComissoesRoute = typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/comissoes';

  if (isComissoesRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#0B0B0B]" />}>
        <ComissoesApp />
      </Suspense>
    );
  }

  return <App />;
}
