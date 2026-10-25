/**
 * Dropify Service Worker
 * Enables PWA Standalone Mode on Android & iOS
 * Maintains background execution priority for MediaSession playback
 */

const CACHE_NAME = 'dropify-cache-v1';
const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE).catch((err) => {
        console.warn('Pre-cache notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Cache-first for static local assets, network-first for API and audio streams
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Audio streams and API calls MUST bypass service worker cache
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/stream/')) {
    return;
  }

  // Handle local app shell
  if (event.request.method === 'GET' && (url.origin === self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch fresh copy in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, respClone);
            });
          }
          return response;
        });
      })
    );
  }
});
