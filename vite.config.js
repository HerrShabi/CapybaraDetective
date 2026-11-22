import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';

// SUPER CAPYBARA: POLICE DETECTIVE runs on port 5176 in development
// (5173 is SuperCapybara, 5174 is SuperCapybara 3, 5175 is SupaCapy 2).
// Online it's its own app on GitHub Pages: https://herrshabi.github.io/CapybaraDetective/ (so the build uses that path).
//
// Like SuperCapybara 3, it works offline once it's on the home screen: the build writes `sw.js`, a service worker
// that keeps a copy of every file of this version. A new version gets a new cache name, so iPads update when online.
const PUBLIC_FILES = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

function offline() {
  return {
    name: 'capybara-detective-offline',
    apply: 'build',
    generateBundle(options, bundle) {
      const built = Object.keys(bundle).filter((file) => file !== 'sw.js');
      const files = ['./', 'index.html', ...new Set([...built, ...PUBLIC_FILES])];
      const version = createHash('sha1').update(built.sort().join('|')).digest('hex').slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorker(files, version) });
    },
  };
}

function serviceWorker(files, version) {
  return `// SUPER CAPYBARA: POLICE DETECTIVE's offline copy (made by vite.config.js). Version ${version}.
const CACHE = 'capybara-detective-${version}';
const FILES = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

// Throw away older versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('capybara-detective-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Opening the game: try the internet (for updates) for a moment, otherwise the saved copy.
// Everything else (the game code, icons): the saved copy first.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    const fromNetwork = fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put('index.html', response.clone()));
      return response;
    });
    const timeout = new Promise((resolve, reject) => setTimeout(reject, 3000));
    event.respondWith(Promise.race([fromNetwork, timeout]).catch(() => caches.match('index.html', { ignoreVary: true })));
    return;
  }
  event.respondWith(
    // (ignoreVary: a saved copy counts even if the server said it depends on how you ask, like the game's module script)
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((saved) =>
      saved ||
      fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      }),
    ),
  );
});
`;
}

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/CapybaraDetective/' : '/',
  server: { port: 5176, strictPort: true },
  preview: { port: 4176 },
  plugins: [offline()],
}));
