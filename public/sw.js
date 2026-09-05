// Service Worker do Rafa Arts CRM — cache do "app shell" (HTML/CSS/JS/imagens/fontes)
// para o sistema continuar abrindo mesmo sem internet.
// Isso NÃO sincroniza dados (vendas, clientes etc) — só garante que a interface carregue offline.

const CACHE_NAME = 'rafa-arts-shell-v7';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      '/',
      '/manifest.json',
      '/icon-192.png',
      '/icon-512.png',
    ])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca cacheia chamadas de API (Supabase/Firebase) — dados sempre precisam ser atuais/online.
  if (url.hostname.includes('supabase.co') || url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  // Navegação (abrir/recarregar a página): sempre busca fresco da rede (ignora cache HTTP
  // do proprio navegador, que senao pode servir um index.html antigo mesmo com F5).
  // Se conseguir buscar da rede, atualiza o cache do app shell com o HTML mais recente
  // (senao o "/" cacheado no install fica parado na versao antiga pra sempre e nunca
  // aponta pros arquivos JS/CSS certos quando ficar offline depois de um novo deploy).
  // Cai pro cache so se estiver realmente offline; se nem isso existir, devolve uma
  // resposta valida (nunca undefined) pra nao quebrar com "Failed to convert value to Response".
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, clone));
        }
        return networkResponse;
      }).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || new Response(
          '<h1>Sem conexão</h1><p>Abra o app pelo menos uma vez online para habilitar o acesso offline.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        ))
      )
    );
    return;
  }

  // Assets estáticos same-origin (JS, CSS, imagens, fontes): cache-first, atualiza em segundo plano.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => cached || new Response('', { status: 503, statusText: 'Offline - not cached' }));
        // Nunca deixa cair em "undefined": se nao tem cache, a promise de fetch ja
        // garante uma Response valida (de sucesso ou o fallback 503 acima).
        return cached || fetchPromise;
      })
    );
  }
});
