const CACHE_NAME = 'dr-x-health-v3';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Instalação: Cache dos arquivos essenciais (Shell)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch: Estratégia Stale-While-Revalidate
// 1. Tenta servir do Cache imediatamente
// 2. Busca na rede em paralelo para atualizar o cache
// 3. Se não tiver no cache, espera a rede
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET ou para outros domínios (opcional)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Atualiza o cache com a nova versão
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Se falhar a rede (offline)
            // Se tiver response do cache, retorna ela (já retornada no return abaixo)
            // Se não, poderia retornar uma página offline.html
          });

        // Retorna o cache se existir, senão espera a rede
        return response || fetchPromise;
      });
    })
  );
});