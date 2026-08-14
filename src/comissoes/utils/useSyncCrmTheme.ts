import { useLayoutEffect } from 'react';

// Mantem qualquer wrapper ".comissoes-app" sincronizado com o tema claro/escuro
// do CRM principal. O CRM controla o tema global adicionando/removendo a classe
// "light-theme" no <html> (ver App.tsx, funcao toggleTheme/setTheme). Em vez de
// depender de Context (o que criaria import circular entre App.tsx e os
// componentes de Comissoes, que sao carregados via React.lazy a partir do
// App.tsx), a gente so observa essa classe diretamente no <html>.
//
// Aplica em TODOS os ".comissoes-app" que estiverem na tela (nao so um ref),
// porque o modulo troca de tela (carregando -> login -> painel) e cada tela e
// um elemento raiz diferente — assim todas ficam corretas assim que aparecem,
// sem depender de qual delas estava montada quando o hook rodou.
export function useSyncWithCrmTheme() {
  useLayoutEffect(() => {
    const applyToAll = () => {
      const isLight = document.documentElement.classList.contains('light-theme');
      document.querySelectorAll('.comissoes-app').forEach((el) => {
        el.setAttribute('data-theme', isLight ? 'light' : 'dark');
      });
    };

    applyToAll();

    // Reage quando o CRM alterna claro/escuro
    const htmlObserver = new MutationObserver(applyToAll);
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Reage quando uma nova tela do modulo de Comissoes entra no DOM
    // (ex: sai da tela de "carregando" e entra a tela de login ou o painel)
    const domObserver = new MutationObserver(applyToAll);
    domObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      htmlObserver.disconnect();
      domObserver.disconnect();
    };
  }, []);
}
