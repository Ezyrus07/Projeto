// NOTE:
// Não faça cache de requests cross-origin (ex: Supabase / CDNs). Isso causa erros
// intermitentes (incluindo CORS/520) porque o SW pode servir respostas antigas/ruins.
// Mantemos cache APENAS para assets do próprio site.
const CACHE_NAME = 'doke-cache-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve(true)))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ✅ Só cacheia o que é do mesmo origin (ex: http://127.0.0.1:5500)
  // 🔒 Nunca intercepta Supabase / CDNs / qualquer host externo.
  if (url.origin !== self.location.origin) return;

  // ✅ Não cachear chamadas "dinâmicas"/API-like mesmo dentro do origin.
  // (segurança extra; no seu caso a API é externa, mas isso previne regressões)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/')) return;

  // Estratégia:
  // - Navegação (HTML): network-first (evita servir HTML velho e quebrar login)
  // - Assets (css/js/img): cache-first
  const isNav = req.mode === 'navigate' || (req.destination === 'document');

  if (isNav) {
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        // Só cacheia respostas OK e do tipo "basic" (mesmo origin)
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
